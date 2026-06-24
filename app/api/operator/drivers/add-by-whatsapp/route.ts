import { withAuth } from "@workos-inc/authkit-nextjs";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getOperatorTenant } from "@/lib/utils/operator";

function normalizePhone(raw: string): string {
  let cleaned = raw.replace(/[\s\-()]/g, "");
  if (!cleaned.startsWith("+")) cleaned = "+" + cleaned;
  return cleaned;
}

export async function POST(req: Request) {
  const { user } = await withAuth({ ensureSignedIn: true });
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tenant = await getOperatorTenant(user.id);
  if (!tenant) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { driverWhatsapp } = await req.json() as { driverWhatsapp: string };
  if (!driverWhatsapp?.trim()) {
    return NextResponse.json({ error: "driverWhatsapp is required" }, { status: 400 });
  }

  const normalized = normalizePhone(driverWhatsapp.trim());

  const driver = await prisma.driver.findFirst({
    where: { phoneNumber: normalized },
    select: { id: true, complianceStatus: true },
  });

  if (!driver) {
    return NextResponse.json({ error: "Driver not found" }, { status: 404 });
  }
  if (driver.complianceStatus !== "active" && driver.complianceStatus !== "expiring_soon") {
    return NextResponse.json({ error: "Driver must be active to join Tier 1" }, { status: 422 });
  }

  const membership = await prisma.operatorDriverMembership.upsert({
    where: { tenantId_driverId: { tenantId: tenant.id, driverId: driver.id } },
    create: {
      tenantId: tenant.id,
      driverId: driver.id,
      tier1Member: true,
      relationshipType: "contracted",
    },
    update: { tier1Member: true },
  });

  await prisma.auditLog.create({
    data: {
      entityType: "driver_membership",
      entityId: membership.id,
      action: "tier1_added",
      actorId: user.id,
      metadata: { driverId: driver.id, tenantId: tenant.id, via: "whatsapp_lookup" },
    },
  });

  return NextResponse.json({ success: true, driverId: driver.id });
}
