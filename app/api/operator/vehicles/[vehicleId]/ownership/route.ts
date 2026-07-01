import { withAuth } from "@workos-inc/authkit-nextjs";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getOperatorTenant } from "@/lib/utils/operator";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ vehicleId: string }> }
) {
  const { user } = await withAuth({ ensureSignedIn: true });
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tenant = await getOperatorTenant(user.id);
  if (!tenant) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { vehicleId } = await params;

  const vehicle = await prisma.vehicle.findFirst({
    where: { id: vehicleId, registeredByTenantId: tenant.id },
  });
  if (!vehicle) return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });

  const body = await req.json();
  const { driverId, relationshipType, contractExpiry } = body;

  if (!driverId || !relationshipType) {
    return NextResponse.json({ error: "driverId and relationshipType are required" }, { status: 400 });
  }

  const driver = await prisma.operatorDriverMembership.findFirst({
    where: { tenantId: tenant.id, driverId },
  });
  if (!driver) {
    return NextResponse.json({ error: "Driver is not a member of this operator" }, { status: 400 });
  }

  const ownership = await prisma.$transaction(async (tx) => {
    await tx.vehicleOwnership.updateMany({
      where: {
        OR: [
          { vehicleId, terminatedAt: null },
          { driverId, terminatedAt: null },
        ],
      },
      data: { terminatedAt: new Date() },
    });
    const o = await tx.vehicleOwnership.create({
      data: {
        vehicleId,
        driverId,
        relationshipType,
        contractStatus: "active",
        contractExpiry: contractExpiry ? new Date(contractExpiry) : null,
      },
    });

    await tx.auditLog.create({
      data: {
        entityType: "vehicle",
        entityId: vehicleId,
        action: "driver_linked",
        actorId: user.id,
        metadata: { driverId, relationshipType, contractExpiry: contractExpiry ?? null },
      },
    });

    return o;
  });

  return NextResponse.json(ownership, { status: 201 });
}
