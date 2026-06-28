import type { PrismaClient } from "@/lib/generated/prisma";
import { normalizePhone } from "@/lib/utils/normalizePhone";
import { emitEvent } from "@/lib/orchestrator/emitter";
import {
  parseDriverCommand,
  commandToStatus,
  commandToEvent,
  commandToReply,
} from "./parseDriverCommand";

interface InboundMessage {
  from: string;
  body: string;
  wamid: string;
  tenantId: string | null;
}

interface HandlerResult {
  handled: boolean;
  reply?: string;
  error?: string;
  orderId?: string;
}

const STATUS_ORDER = [
  "booked",
  "assigned",
  "en_route",
  "arrived",
  "started",
  "completed",
];

export async function handleInboundDriverMessage(
  msg: InboundMessage,
  prisma: PrismaClient
): Promise<HandlerResult> {
  const parsed = parseDriverCommand(msg.body);
  if (!parsed) return { handled: false };

  const { command, jobReference } = parsed;

  try {
    const normalised = normalizePhone(msg.from);
    if (!normalised) {
      console.warn(`[InboundDriver] Could not normalise phone: ${msg.from}`);
      return { handled: false, error: "Could not normalise sender phone" };
    }

    const driver = await prisma.driver.findFirst({
      where: { phoneNumber: normalised },
      select: { id: true, firstName: true, lastName: true },
    });

    if (!driver) {
      console.warn(`[InboundDriver] No driver found for phone: ${normalised}`);
      // Do not reply — unknown sender could be spam
      return { handled: false, error: `No driver found for ${normalised}` };
    }

    const driverName = `${driver.firstName} ${driver.lastName}`.trim();

    const order = await prisma.order.findFirst({
      where: {
        jobReference,
        driverId: driver.id,
      },
      select: {
        id: true,
        jobReference: true,
        status: true,
        tenantId: true,
      },
    });

    if (!order) {
      console.warn(
        `[InboundDriver] Order not found or not assigned to driver ${driverName}: ${jobReference}`
      );
      return {
        handled: true,
        reply: `Job ${jobReference} not found or not assigned to you. Please check the reference and try again.`,
        error: "Order not found for driver",
      };
    }

    const newStatus = commandToStatus(command);
    const eventType = commandToEvent(command);

    // Duplicate command guard
    if (order.status === newStatus) {
      return {
        handled: true,
        reply: `${jobReference} is already marked as ${newStatus}. No change made.`,
        orderId: order.id,
      };
    }

    // Backward transition guard (completed is terminal — never allow backward moves)
    const currentIdx = STATUS_ORDER.indexOf(order.status);
    const newIdx = STATUS_ORDER.indexOf(newStatus);
    if (newIdx < currentIdx) {
      return {
        handled: true,
        reply: `Cannot update ${jobReference} — current status is already ${order.status}.`,
        orderId: order.id,
      };
    }

    await prisma.order.update({
      where: { id: order.id },
      data: { status: newStatus },
    });

    console.log(
      `[InboundDriver] ${driverName} | ${jobReference} | ${order.status} → ${newStatus}`
    );

    await emitEvent(eventType, { orderId: order.id }, prisma);

    return {
      handled: true,
      reply: commandToReply(command, jobReference),
      orderId: order.id,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(
      `[InboundDriver] Error processing command "${msg.body}" from ${msg.from}: ${message}`
    );
    return { handled: false, error: message };
  }
}
