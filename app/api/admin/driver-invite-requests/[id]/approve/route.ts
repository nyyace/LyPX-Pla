import { withAuth } from "@workos-inc/authkit-nextjs";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { addDays } from "@/lib/utils/date";
import { sendWhatsAppTemplate } from "@/lib/whatsapp/client";

export async function PATCH(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user } = await withAuth({ ensureSignedIn: true });
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const request = await prisma.driverInviteRequest.findUnique({
    where: { id },
    include: { tenant: { select: { name: true } } },
  });

  if (!request) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (request.status !== "pending") {
    return NextResponse.json({ error: "Request is not pending" }, { status: 422 });
  }

  const appBase = process.env.NEXT_PUBLIC_APP_URL ?? "https://lypx.co";
  const onboardLink = `${appBase}/onboard?invite=${id}`;
  const now = new Date();

  // Send WhatsApp invite to driver
  try {
    await sendWhatsAppTemplate({
      to: request.driverWhatsapp,
      templateKey: "driver_invite",
      components: [
        {
          type: "body",
          parameters: [
            { type: "text", text: request.tenant.name },
            { type: "text", text: onboardLink },
          ],
        },
      ],
      entityType: "driver_invite_request",
      entityId: id,
      actorId: user.id,
    });
  } catch {
    return NextResponse.json({ error: "Failed to send WhatsApp message" }, { status: 502 });
  }

  await prisma.$transaction(async (tx) => {
    await tx.driverInviteRequest.update({
      where: { id },
      data: {
        status: "sent",
        approvedBy: user.id,
        approvedAt: now,
        sentAt: now,
        expiresAt: addDays(now, 7),
      },
    });

    await tx.auditLog.create({
      data: {
        entityType: "driver_invite_request",
        entityId: id,
        action: "driver_invite_approved_and_sent",
        actorId: user.id,
        metadata: {
          tenantId: request.tenantId,
          driverWhatsapp: request.driverWhatsapp,
          onboardLink,
        },
      },
    });
  });

  return NextResponse.json({ success: true });
}
