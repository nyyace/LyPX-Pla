import { withAuth } from "@workos-inc/authkit-nextjs";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { isAdminUser } from "@/lib/utils/admin";
import { normalizePhone } from "@/lib/utils/normalizePhone";
import { addDays } from "@/lib/utils/date";
import { sendWhatsAppTemplate } from "@/lib/whatsapp/client";

export async function POST(req: Request) {
  const { user } = await withAuth({ ensureSignedIn: true });
  if (!user || !(await isAdminUser(user.id))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json() as { driverWhatsapp?: string; driverName?: string };
  const { driverWhatsapp, driverName } = body;

  if (!driverWhatsapp?.trim()) {
    return NextResponse.json({ error: "driverWhatsapp is required" }, { status: 400 });
  }

  const phone = normalizePhone(driverWhatsapp);
  if (!phone) {
    return NextResponse.json({ error: "Invalid phone number" }, { status: 400 });
  }

  const now = new Date();
  const appBase = process.env.APP_URL ?? "https://workspace.lymo-x.com";

  const request = await prisma.driverInviteRequest.create({
    data: {
      tenantId: "lypx_direct",
      driverWhatsapp: phone,
      driverName: driverName?.trim() || null,
      status: "sent",
      approvedBy: user.id,
      approvedAt: now,
      sentAt: now,
      expiresAt: addDays(now, 7),
    },
  });

  const onboardLink = `${appBase}/onboard?invite=${request.id}`;

  try {
    await sendWhatsAppTemplate({
      to: phone,
      templateKey: "driver_invite",
      components: [
        {
          type: "body",
          parameters: [
            { type: "text", text: "LyPX Direct" },
            { type: "text", text: onboardLink },
          ],
        },
      ],
      entityType: "driver_invite_request",
      entityId: request.id,
      actorId: user.id,
      tenantId: "lypx_direct",
      recipient: "driver",
    });
  } catch {
    await prisma.driverInviteRequest.update({
      where: { id: request.id },
      data: { status: "pending", sentAt: null },
    });
    return NextResponse.json({ error: "Failed to send WhatsApp message" }, { status: 502 });
  }

  await prisma.auditLog.create({
    data: {
      entityType: "driver_invite_request",
      entityId: request.id,
      action: "driver_invite_sent_by_admin",
      actorId: user.id,
      metadata: { driverWhatsapp: phone, onboardLink },
    },
  });

  return NextResponse.json(request, { status: 201 });
}

export async function GET() {
  const { user } = await withAuth({ ensureSignedIn: true });
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const requests = await prisma.driverInviteRequest.findMany({
    where: { status: { in: ["pending", "approved", "sent"] } },
    include: {
      tenant: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(
    requests.map((r) => ({
      id: r.id,
      tenantId: r.tenantId,
      tenantName: r.tenant.name,
      driverWhatsapp: r.driverWhatsapp,
      driverName: r.driverName,
      status: r.status,
      adminNote: r.adminNote,
      createdAt: r.createdAt.toISOString(),
      sentAt: r.sentAt?.toISOString() ?? null,
      expiresAt: r.expiresAt?.toISOString() ?? null,
    }))
  );
}
