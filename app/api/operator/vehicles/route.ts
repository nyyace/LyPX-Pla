import { withAuth } from "@workos-inc/authkit-nextjs";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getOperatorTenant } from "@/lib/utils/operator";

export async function GET() {
  const { user } = await withAuth({ ensureSignedIn: true });
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tenant = await getOperatorTenant(user.id);
  if (!tenant) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const vehicles = await prisma.vehicle.findMany({
    where: { registeredByTenantId: tenant.id },
    include: {
      ownership: {
        where: { contractStatus: "active" },
        include: { driver: { select: { id: true, firstName: true, lastName: true, complianceStatus: true } } },
      },
      documents: {
        select: { id: true, docType: true, status: true, expiryDate: true, file: { select: { fileName: true } } },
        orderBy: { uploadedAt: "desc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(vehicles);
}

export async function POST(req: Request) {
  const { user } = await withAuth({ ensureSignedIn: true });
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tenant = await getOperatorTenant(user.id);
  if (!tenant) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const { make, model, plateNumber, year, colour, seatingCapacity, vehicleClass, insuranceCompany } = body;

  if (!make || !model || !plateNumber) {
    return NextResponse.json({ error: "make, model, and plateNumber are required" }, { status: 400 });
  }

  const existing = await prisma.vehicle.findUnique({ where: { plateNumber } });
  if (existing) {
    return NextResponse.json({ error: "A vehicle with this plate number already exists" }, { status: 409 });
  }

  const vehicle = await prisma.$transaction(async (tx) => {
    const v = await tx.vehicle.create({
      data: {
        registeredByTenantId: tenant.id,
        make,
        model,
        plateNumber: plateNumber.toUpperCase().trim(),
        year: year ? parseInt(year) : null,
        colour: colour ?? null,
        seatingCapacity: seatingCapacity ? parseInt(seatingCapacity) : null,
        vehicleClass: vehicleClass ?? null,
        insuranceCompany: insuranceCompany ?? null,
        status: "inactive",
      },
    });

    await tx.auditLog.create({
      data: {
        entityType: "vehicle",
        entityId: v.id,
        action: "vehicle_registered",
        actorId: user.id,
        metadata: { make, model, plateNumber: v.plateNumber, tenantId: tenant.id },
      },
    });

    return v;
  });

  return NextResponse.json(vehicle, { status: 201 });
}
