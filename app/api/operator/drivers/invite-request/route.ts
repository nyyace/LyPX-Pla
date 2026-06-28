import { withAuth } from "@workos-inc/authkit-nextjs";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getOperatorTenant } from "@/lib/utils/operator";
import { normalizePhone } from "@/lib/utils/normalizePhone";

export async function GET() {
  const { user } = await withAuth({ ensureSignedIn: true });
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tenant = await getOperatorTenant(user.id);
  if (!tenant) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const requests = await prisma.driverInviteRequest.findMany({
    where: { tenantId: tenant.id, status: { in: ["pending", "approved", "sent"] } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(
    requests.map((r) => ({
      id: r.id,
      driverWhatsapp: r.driverWhatsapp,
      driverName: r.driverName,
      status: r.status,
      createdAt: r.createdAt.toISOString(),
      sentAt: r.sentAt?.toISOString() ?? null,
      expiresAt: r.expiresAt?.toISOString() ?? null,
    }))
  );
}

export async function POST(req: Request) {
  const { user } = await withAuth({ ensureSignedIn: true });
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tenant = await getOperatorTenant(user.id);
  if (!tenant) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { driverWhatsapp, driverName } = await req.json() as {
    driverWhatsapp: string;
    driverName?: string;
  };

  if (!driverWhatsapp?.trim()) {
    return NextResponse.json({ error: "driverWhatsapp is required" }, { status: 400 });
  }

  const normalized = normalizePhone(driverWhatsapp.trim());
  if (!normalized) {
    return NextResponse.json({ error: "Invalid phone number format" }, { status: 400 });
  }

  // Prevent duplicate pending request for same number + tenant
  const existing = await prisma.driverInviteRequest.findFirst({
    where: {
      tenantId: tenant.id,
      driverWhatsapp: normalized,
      status: { in: ["pending", "approved", "sent"] },
    },
  });
  if (existing) {
    return NextResponse.json(
      { error: "A pending invite request already exists for this number" },
      { status: 409 }
    );
  }

  const request = await prisma.$transaction(async (tx) => {
    const r = await tx.driverInviteRequest.create({
      data: {
        tenantId: tenant.id,
        driverWhatsapp: normalized,
        driverName: driverName?.trim() || null,
        status: "pending",
      },
    });

    await tx.auditLog.create({
      data: {
        entityType: "driver_invite_request",
        entityId: r.id,
        action: "driver_invite_requested",
        actorId: user.id,
        metadata: { tenantId: tenant.id, driverWhatsapp: normalized },
      },
    });

    return r;
  });

  return NextResponse.json(
    { success: true, id: request.id, message: "Request sent to LyPX for review." },
    { status: 201 }
  );
}
