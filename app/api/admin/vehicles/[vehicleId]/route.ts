import { NextResponse } from "next/server";
import { withAuth } from "@workos-inc/authkit-nextjs";
import { prisma } from "@/lib/prisma";
import { isAdminUser } from "@/lib/utils/admin";
import { evaluateAndSyncVehicleCompliance } from "@/lib/compliance/state-machine";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ vehicleId: string }> }
) {
  const { user } = await withAuth({ ensureSignedIn: true });
  if (!user || !(await isAdminUser(user.id))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { vehicleId } = await params;

  const vehicle = await prisma.vehicle.findUnique({ where: { id: vehicleId }, select: { id: true } });
  if (!vehicle) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json() as {
    make?: string;
    model?: string;
    year?: number | null;
    colour?: string | null;
    vehicleClass?: string | null;
    seatingCapacity?: number | null;
    insuranceCompany?: string | null;
    status?: string;
    clearStatusOverride?: boolean;
  };

  const VALID_CLASSES = [
    "standard_sedan", "standard_mpv_nve", "executive_sedan_eclass",
    "luxury_sedan_sclass", "executive_mpv_avf", "prestige_mpv_lexus",
    "luxury_executive_van_vvv", "group_van_combi", "prestige_collection",
    "electric_executive_mpv",
  ];

  const updates: Record<string, unknown> = {};
  if (body.make !== undefined)             updates.make             = body.make?.trim() || undefined;
  if (body.model !== undefined)            updates.model            = body.model?.trim() || undefined;
  if (body.year !== undefined)             updates.year             = body.year ?? null;
  if (body.colour !== undefined)           updates.colour           = body.colour?.trim() || null;
  if (body.seatingCapacity !== undefined)  updates.seatingCapacity  = body.seatingCapacity ?? null;
  if (body.insuranceCompany !== undefined) updates.insuranceCompany = body.insuranceCompany?.trim() || null;

  if (body.vehicleClass !== undefined) {
    if (body.vehicleClass !== null && !VALID_CLASSES.includes(body.vehicleClass)) {
      return NextResponse.json({ error: "Invalid vehicleClass" }, { status: 400 });
    }
    updates.vehicleClass = body.vehicleClass;
  }

  const VALID_VEHICLE_STATUSES = ["active", "inactive", "suspended"];
  if (body.clearStatusOverride) {
    updates.statusOverriddenAt = null;
    updates.statusOverriddenBy = null;
  } else if (body.status !== undefined) {
    if (!VALID_VEHICLE_STATUSES.includes(body.status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }
    updates.status             = body.status;
    updates.statusOverriddenAt = new Date();
    updates.statusOverriddenBy = user.id;
  }

  if (!Object.keys(updates).length) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  await prisma.vehicle.update({ where: { id: vehicleId }, data: updates });

  await prisma.auditLog.create({
    data: {
      entityType: "vehicle",
      entityId: vehicleId,
      action: body.clearStatusOverride ? "vehicle_override_cleared" : "vehicle_updated",
      actorId: user.id,
      metadata: { changes: updates as object } as object,
    },
  });

  if (!updates.statusOverriddenAt) {
    await evaluateAndSyncVehicleCompliance(vehicleId, user.id);
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ vehicleId: string }> }
) {
  const { user } = await withAuth({ ensureSignedIn: true });
  if (!user || !(await isAdminUser(user.id))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { vehicleId } = await params;

  const vehicle = await prisma.vehicle.findUnique({
    where: { id: vehicleId },
    select: { id: true, deletedAt: true, _count: { select: { orders: true } } },
  });
  if (!vehicle) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (vehicle.deletedAt) return NextResponse.json({ error: "Already removed" }, { status: 409 });
  if (vehicle._count.orders > 0) {
    return NextResponse.json(
      { error: "Cannot remove a vehicle with existing orders" },
      { status: 422 }
    );
  }

  await prisma.$transaction(async (tx) => {
    await tx.vehicleOwnership.updateMany({
      where: { vehicleId, terminatedAt: null },
      data: { terminatedAt: new Date(), notes: "Vehicle removed by admin" },
    });

    await tx.vehicle.update({
      where: { id: vehicleId },
      data: { deletedAt: new Date() },
    });

    await tx.auditLog.create({
      data: {
        entityType: "vehicle",
        entityId: vehicleId,
        action: "vehicle_removed",
        actorId: user.id,
        metadata: {},
      },
    });
  });

  return NextResponse.json({ ok: true });
}
