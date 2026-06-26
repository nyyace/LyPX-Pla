import { prisma } from "@/lib/prisma";
import { TEMPLATE_REGISTRY, type OrderContext } from "./templates";
import { resolveRecipients } from "@/lib/utils/recipients";
import { sendWhatsAppTemplate } from "./sender";

function getPhoneNumbers(
  recipientTypes: ("requestor" | "passenger" | "driver")[],
  resolved: { requestor: string | null; passenger: string | null; driver: string | null }
): string[] {
  const numbers = recipientTypes.map((t) => resolved[t]);
  return [...new Set(numbers.filter((n): n is string => !!n))];
}

export async function processEventQueue(): Promise<{
  processed: number;
  sent: number;
  failed: number;
  skipped: number;
}> {
  // Reset stuck 'processing' events older than 5 minutes
  await prisma.eventQueue.updateMany({
    where: {
      status: "processing",
      createdAt: { lt: new Date(Date.now() - 5 * 60 * 1000) },
    },
    data: { status: "pending" },
  });

  const events = await prisma.eventQueue.findMany({
    where: { status: "pending", attempts: { lt: 3 } },
    orderBy: { createdAt: "asc" },
    take: 10,
  });

  let sent = 0, failed = 0, skipped = 0;

  for (const event of events) {
    await prisma.eventQueue.update({
      where: { id: event.id },
      data: { status: "processing", attempts: { increment: 1 } },
    });

    try {
      const result = await processEvent(event.id, event.eventType, event.payload);
      sent    += result.sent;
      failed  += result.failed;
      skipped += result.skipped;

      const finalStatus =
        result.skipped > 0 && result.sent === 0 && result.failed === 0
          ? "skipped"
          : result.failed > 0 && result.sent === 0
            ? "failed"
            : "sent";

      await prisma.eventQueue.update({
        where: { id: event.id },
        data: { status: finalStatus, processedAt: new Date(), lastError: result.lastError ?? null },
      });
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "Unknown";
      await prisma.eventQueue.update({
        where: { id: event.id },
        data: {
          status: event.attempts >= 2 ? "failed" : "pending",
          lastError: errMsg,
        },
      });
      failed++;
    }
  }

  return { processed: events.length, sent, failed, skipped };
}

async function processEvent(
  eventId: string,
  eventType: string,
  payload: unknown
): Promise<{ sent: number; failed: number; skipped: number; lastError?: string }> {
  const template = TEMPLATE_REGISTRY[eventType];

  if (!template) {
    return { sent: 0, failed: 0, skipped: 1 };
  }

  const orderId = (payload as { orderId: string }).orderId;

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      account: true,
      tenant: true,
      driver: {
        include: {
          vehicleOwnerships: {
            include: { vehicle: true },
            where: {
              OR: [{ contractStatus: "active" }, { contractStatus: null }],
            },
            take: 1,
          },
        },
      },
    },
  });

  if (!order?.driver) {
    await prisma.auditLog.create({
      data: {
        entityType: "whatsapp_send",
        entityId: eventId,
        action: "skipped_no_driver",
        actorId: "system",
        metadata: { orderId, eventType },
      },
    });
    return { sent: 0, failed: 0, skipped: 1 };
  }

  const vehicle = order.driver.vehicleOwnerships[0]?.vehicle ?? null;

  const ctx: OrderContext = {
    jobReference:    order.jobReference ?? order.id.slice(-8).toUpperCase(),
    serviceType:     order.serviceType ?? "p2p",
    pickupTime:      order.pickupTime,
    timezone:        order.timezone,
    pickupAddress:   order.pickupLocation,
    dropoffAddress:  order.dropoffLocation ?? null,
    driverFirstName: order.driver.firstName,
    driverLastName:  order.driver.lastName,
    driverPhone:     order.driver.phoneNumber,
    vehicleColour:   vehicle?.colour ?? null,
    vehicleMake:     vehicle?.make ?? null,
    vehicleModel:    vehicle?.model ?? null,
    vehiclePlate:    vehicle?.plateNumber ?? null,
  };

  const variables = template.resolveVariables(ctx);
  const resolved = await resolveRecipients(orderId, prisma);
  const phoneNumbers = getPhoneNumbers(template.recipients, resolved);

  if (phoneNumbers.length === 0) {
    await prisma.auditLog.create({
      data: {
        entityType: "whatsapp_send",
        entityId: eventId,
        action: "skipped_no_recipients",
        actorId: "system",
        metadata: { orderId, eventType },
      },
    });
    return { sent: 0, failed: 0, skipped: 1 };
  }

  let sent = 0, failed = 0;
  let lastError: string | undefined;

  for (const phone of phoneNumbers) {
    const result = await sendWhatsAppTemplate({
      to: phone,
      templateName: template.templateName,
      language: template.language,
      variables,
      tenantId: order.tenantId,
    });

    await prisma.auditLog.create({
      data: {
        entityType: "whatsapp_send",
        entityId: eventId,
        action: result.success ? "sent" : "failed",
        actorId: "system",
        metadata: {
          orderId,
          eventType,
          templateName: template.templateName,
          recipient: phone,
          messageId: result.messageId ?? null,
          error: result.error ?? null,
        },
      },
    });

    if (result.success) {
      sent++;
    } else {
      failed++;
      lastError = result.error;
    }
  }

  return { sent, failed, skipped: 0, lastError };
}
