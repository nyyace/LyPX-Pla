import { withAuth } from "@workos-inc/authkit-nextjs";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getOperatorTenant } from "@/lib/utils/operator";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ driverId: string }> }
) {
  const { user } = await withAuth({ ensureSignedIn: true });
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tenant = await getOperatorTenant(user.id);
  if (!tenant) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { driverId } = await params;

  const driver = await prisma.driver.findUnique({
    where: { id: driverId },
    select: { id: true, complianceStatus: true },
  });
  if (!driver) return NextResponse.json({ error: "Driver not found" }, { status: 404 });

  if (driver.complianceStatus !== "active") {
    return NextResponse.json(
      { error: "Driver must be active to join Tier 1" },
      { status: 422 }
    );
  }

  const membership = await prisma.operatorDriverMembership.upsert({
    where: { tenantId_driverId: { tenantId: tenant.id, driverId } },
    create: {
      tenantId: tenant.id,
      driverId,
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
      metadata: { driverId, tenantId: tenant.id },
    },
  });

  return NextResponse.json({ success: true });
}
