import { withAuth } from "@workos-inc/authkit-nextjs";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getOperatorTenant } from "@/lib/utils/operator";
import { normalizePhone } from "@/lib/utils/normalizePhone";

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
  if (!normalized) {
    return NextResponse.json({ error: "Invalid phone number format" }, { status: 400 });
  }

  // When duplicate phone entries exist, pick the best-standing one.
  const STATUS_PRIORITY = ["active", "expiring_soon", "pending", "suspended"];
  const allMatches = await prisma.driver.findMany({
    where: { phoneNumber: normalized, deletedAt: null },
    select: { id: true, complianceStatus: true },
  });

  if (allMatches.length === 0) {
    return NextResponse.json({ error: "Driver not found" }, { status: 404 });
  }

  const driver = allMatches.sort(
    (a, b) => STATUS_PRIORITY.indexOf(a.complianceStatus) - STATUS_PRIORITY.indexOf(b.complianceStatus)
  )[0];

  if (driver.complianceStatus !== "active" && driver.complianceStatus !== "expiring_soon") {
    return NextResponse.json({ error: "Driver must be active to join Tier 1" }, { status: 422 });
  }

  // Check whether a membership row already exists (active or previously removed).
  const existing = await prisma.operatorDriverMembership.findUnique({
    where: { tenantId_driverId: { tenantId: tenant.id, driverId: driver.id } },
  });

  const isReadd = existing !== null && !existing.tier1Member;
  const isAlreadyActive = existing?.tier1Member === true;

  // Limit check only applies to genuinely new members — not re-adds (upsert-update path).
  if (!existing) {
    const activeCount = await prisma.operatorDriverMembership.count({
      where: { tenantId: tenant.id, tier1Member: true },
    });
    if (activeCount >= tenant.driverLimit) {
      return NextResponse.json(
        { error: `Driver limit reached (${tenant.driverLimit}). Upgrade your plan to add more drivers.` },
        { status: 422 }
      );
    }
  }

  if (isAlreadyActive) {
    return NextResponse.json({ success: true, driverId: driver.id });
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
      action: isReadd ? "tier1_readded" : "tier1_added",
      actorId: user.id,
      metadata: { driverId: driver.id, tenantId: tenant.id, via: "whatsapp_lookup" },
    },
  });

  return NextResponse.json({ success: true, driverId: driver.id });
}
