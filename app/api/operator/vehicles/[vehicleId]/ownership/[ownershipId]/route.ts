import { withAuth } from "@workos-inc/authkit-nextjs";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getOperatorTenant } from "@/lib/utils/operator";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ vehicleId: string; ownershipId: string }> }
) {
  const { user } = await withAuth({ ensureSignedIn: true });
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tenant = await getOperatorTenant(user.id);
  if (!tenant) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { vehicleId, ownershipId } = await params;

  const vehicle = await prisma.vehicle.findFirst({
    where: { id: vehicleId, registeredByTenantId: tenant.id },
  });
  if (!vehicle) return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });

  const ownership = await prisma.vehicleOwnership.findFirst({
    where: { id: ownershipId, vehicleId },
  });
  if (!ownership) return NextResponse.json({ error: "Ownership record not found" }, { status: 404 });

  await prisma.$transaction(async (tx) => {
    await tx.vehicleOwnership.update({
      where: { id: ownershipId },
      data: { contractStatus: "terminated" },
    });

    await tx.auditLog.create({
      data: {
        entityType: "vehicle",
        entityId: vehicleId,
        action: "driver_unlinked",
        actorId: user.id,
        metadata: { ownershipId, driverId: ownership.driverId },
      },
    });
  });

  return NextResponse.json({ ok: true });
}
