import { NextResponse } from "next/server";
import { withAuth } from "@workos-inc/authkit-nextjs";
import { prisma } from "@/lib/prisma";
import { isAdminUser } from "@/lib/utils/admin";
import { evaluateAndSyncDriverCompliance, evaluateAndSyncVehicleCompliance } from "@/lib/compliance/state-machine";

export async function POST(req: Request) {
  const { user } = await withAuth({ ensureSignedIn: true });
  if (!user || !(await isAdminUser(user.id))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json() as {
    driverId: string;
    vehicleId: string;
    relationshipType: "owned" | "contracted";
    contractStatus?: "active" | "expired" | "terminated";
    contractExpiry?: string | null;
    notes?: string;
  };

  if (!body.driverId || !body.vehicleId || !body.relationshipType) {
    return NextResponse.json({ error: "driverId, vehicleId, and relationshipType are required" }, { status: 400 });
  }
  if (!["owned", "contracted"].includes(body.relationshipType)) {
    return NextResponse.json({ error: "relationshipType must be 'owned' or 'contracted'" }, { status: 400 });
  }

  const [driver, vehicle] = await Promise.all([
    prisma.driver.findUnique({ where: { id: body.driverId }, select: { id: true } }),
    prisma.vehicle.findUnique({ where: { id: body.vehicleId }, select: { id: true } }),
  ]);
  if (!driver) return NextResponse.json({ error: "Driver not found" }, { status: 404 });
  if (!vehicle) return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });

  const now = new Date();
  const assignment = await prisma.$transaction(async (tx) => {
    await tx.vehicleOwnership.updateMany({
      where: {
        OR: [
          { vehicleId: body.vehicleId, terminatedAt: null },
          { driverId: body.driverId, terminatedAt: null },
        ],
      },
      data: { terminatedAt: now },
    });
    return tx.vehicleOwnership.create({
      data: {
        driverId: body.driverId,
        vehicleId: body.vehicleId,
        relationshipType: body.relationshipType,
        contractStatus: body.relationshipType === "contracted" ? (body.contractStatus ?? "active") : null,
        contractExpiry: body.contractExpiry ? new Date(body.contractExpiry) : null,
        notes: body.notes?.trim() || null,
      },
    });
  });

  await prisma.auditLog.create({
    data: {
      entityType: "driver",
      entityId: body.driverId,
      action: "vehicle_assignment_created",
      actorId: user.id,
      metadata: { vehicleId: body.vehicleId, relationshipType: body.relationshipType },
    },
  });

  await Promise.all([
    evaluateAndSyncDriverCompliance(body.driverId, user.id),
    evaluateAndSyncVehicleCompliance(body.vehicleId, user.id),
  ]);

  return NextResponse.json(assignment, { status: 201 });
}
