import { NextResponse } from "next/server";
import { withAuth } from "@workos-inc/authkit-nextjs";
import { prisma, type TxClient } from "@/lib/prisma";
import { getOperatorTenant } from "@/lib/utils/operator";
import { reactivateVehicle } from "@/lib/entities/reactivation";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ vehicleId: string }> }
) {
  const { user } = await withAuth({ ensureSignedIn: true });
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tenant = await getOperatorTenant(user.id);
  if (!tenant) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { vehicleId } = await params;

  const existing = await prisma.vehicle.findUnique({
    where: { id: vehicleId },
    select: { id: true, deletedAt: true, registeredByTenantId: true },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (existing.registeredByTenantId !== tenant.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!existing.deletedAt) return NextResponse.json({ error: "Vehicle is not removed — nothing to reactivate" }, { status: 409 });

  const body = await req.json().catch(() => ({})) as {
    make?: string; model?: string; year?: number | null; colour?: string | null;
    seatingCapacity?: number | null; insuranceCompany?: string | null;
  };

  const vehicle = await prisma.$transaction((tx: TxClient) =>
    reactivateVehicle(tx, vehicleId, user.id, {
      ...(body.make !== undefined ? { make: body.make.trim() } : {}),
      ...(body.model !== undefined ? { model: body.model.trim() } : {}),
      ...(body.year !== undefined ? { year: body.year } : {}),
      ...(body.colour !== undefined ? { colour: body.colour } : {}),
      ...(body.seatingCapacity !== undefined ? { seatingCapacity: body.seatingCapacity } : {}),
      ...(body.insuranceCompany !== undefined ? { insuranceCompany: body.insuranceCompany } : {}),
    })
  );

  return NextResponse.json(vehicle);
}
