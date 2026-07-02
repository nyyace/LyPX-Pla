import { NextResponse } from "next/server";
import { withAuth } from "@workos-inc/authkit-nextjs";
import { prisma, type TxClient } from "@/lib/prisma";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const q = searchParams.get("q");

  const vehicles = await prisma.vehicle.findMany({
    where: {
      deletedAt: null,
      ...(status ? { status } : {}),
      ...(q
        ? {
            OR: [
              { plateNumber: { contains: q, mode: "insensitive" } },
              { make: { contains: q, mode: "insensitive" } },
              { model: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: { plateNumber: "asc" },
    include: { _count: { select: { documents: true } } },
  });

  return NextResponse.json(vehicles);
}

export async function POST(req: Request) {
  const { user } = await withAuth({ ensureSignedIn: true });
  const body = await req.json();
  const { make, model, plateNumber, registeredByTenantId } = body;

  if (!make || !model || !plateNumber) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const existing = await prisma.vehicle.findFirst({ where: { plateNumber: plateNumber.toUpperCase() } });
  if (existing && !existing.deletedAt) {
    return NextResponse.json(
      { error: "Vehicle with this plate number already exists", existingId: existing.id },
      { status: 409 }
    );
  }
  if (existing && existing.deletedAt) {
    return NextResponse.json(
      { error: "A vehicle with this plate number was previously removed", reactivatable: true, vehicleId: existing.id },
      { status: 409 }
    );
  }

  const vehicle = await prisma.$transaction(async (tx: TxClient) => {
    const v = await tx.vehicle.create({
      data: {
        make: make.trim(),
        model: model.trim(),
        plateNumber: plateNumber.trim().toUpperCase(),
        registeredByTenantId: registeredByTenantId ?? "lypx_direct",
        status: "inactive",
      },
    });

    await tx.auditLog.create({
      data: {
        entityType: "vehicle",
        entityId: v.id,
        action: "vehicle_created",
        actorId: user.id,
        metadata: { make, model, plateNumber },
      },
    });

    return v;
  });

  return NextResponse.json(vehicle, { status: 201 });
}
