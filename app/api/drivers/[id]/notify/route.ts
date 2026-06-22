import { NextResponse } from "next/server";
import { withAuth } from "@workos-inc/authkit-nextjs";
import { prisma } from "@/lib/prisma";
import { sendWhatsAppTemplate } from "@/lib/whatsapp/client";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user } = await withAuth({ ensureSignedIn: true });
  const { id } = await params;
  const body = await req.json();
  const { notification } = body; // "approved" | "rejected"

  if (!["approved", "rejected"].includes(notification)) {
    return NextResponse.json({ error: "notification must be 'approved' or 'rejected'" }, { status: 400 });
  }

  const driver = await prisma.driver.findUnique({ where: { id } });
  if (!driver) return NextResponse.json({ error: "Driver not found" }, { status: 404 });

  const templateKey = notification === "approved" ? "onboarding_approved" : "onboarding_rejected";

  try {
    await sendWhatsAppTemplate({
      to: driver.phoneNumber,
      templateKey,
      actorId: user.id,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "WhatsApp send failed";
    return NextResponse.json({ error: msg }, { status: 502 });
  }

  await prisma.auditLog.create({
    data: {
      entityType: "driver",
      entityId: id,
      action: `onboarding_notification_sent`,
      actorId: user.id,
      metadata: { notification, phone: driver.phoneNumber },
    },
  });

  return NextResponse.json({ sent: true });
}
