import { NextResponse } from "next/server";
import { withAuth } from "@workos-inc/authkit-nextjs";
import { prisma } from "@/lib/prisma";
import { sendWhatsAppTemplate, sendWhatsAppText } from "@/lib/whatsapp/client";
import { evaluateAndSyncDriverCompliance } from "@/lib/compliance/state-machine";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user } = await withAuth({ ensureSignedIn: true });
  const { id } = await params;
  const body = await req.json();
  const { notification, message } = body;

  if (!["approved", "request_info", "rejected"].includes(notification)) {
    return NextResponse.json(
      { error: "notification must be 'approved', 'request_info', or 'rejected'" },
      { status: 400 }
    );
  }

  const driver = await prisma.driver.findUnique({ where: { id } });
  if (!driver) return NextResponse.json({ error: "Driver not found" }, { status: 404 });

  if (notification === "approved") {
    // Set all pending documents to verified, then run compliance engine
    await prisma.complianceDocument.updateMany({
      where: { driverId: id, status: "pending_review" },
      data: { status: "verified", reviewedBy: user.id, reviewedAt: new Date() },
    });
    await evaluateAndSyncDriverCompliance(id, user.id);

    await prisma.auditLog.create({
      data: {
        entityType: "driver",
        entityId: id,
        action: "onboarding_approved",
        actorId: user.id,
        metadata: { phone: driver.phoneNumber },
      },
    });

    try {
      await sendWhatsAppTemplate({
        to: driver.phoneNumber,
        templateKey: "onboarding_approved",
        entityType: "driver",
        entityId: id,
        actorId: user.id,
      });
    } catch {
      // Non-blocking
    }
  } else if (notification === "request_info") {
    if (!message?.trim()) {
      return NextResponse.json({ error: "A message is required for request_info" }, { status: 400 });
    }

    await prisma.auditLog.create({
      data: {
        entityType: "driver",
        entityId: id,
        action: "onboarding_info_requested",
        actorId: user.id,
        metadata: { message: message.trim(), phone: driver.phoneNumber },
      },
    });

    try {
      await sendWhatsAppText({
        to:          driver.phoneNumber,
        message:     message.trim(),
        entityType:  "driver",
        entityId:    id,
        actorId:     user.id,
      });
    } catch (err) {
      console.error("[notify] request_info send failed:", err);
      return NextResponse.json(
        { error: "Driver has no active WhatsApp session — message not delivered. The note has been saved to the audit log." },
        { status: 502 }
      );
    }
  } else {
    // rejected
    await prisma.driver.update({
      where: { id },
      data: { complianceStatus: "suspended" },
    });

    await prisma.auditLog.create({
      data: {
        entityType: "driver",
        entityId: id,
        action: "onboarding_rejected",
        actorId: user.id,
        metadata: { phone: driver.phoneNumber },
      },
    });

    try {
      await sendWhatsAppTemplate({
        to: driver.phoneNumber,
        templateKey: "onboarding_rejected",
        entityType: "driver",
        entityId: id,
        actorId: user.id,
      });
    } catch {
      // Non-blocking
    }
  }

  return NextResponse.json({ sent: true, notification });
}
