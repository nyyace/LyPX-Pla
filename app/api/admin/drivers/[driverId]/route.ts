import { withAuth } from "@workos-inc/authkit-nextjs";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { isAdminUser } from "@/lib/utils/admin";
import { evaluateAndSyncDriverCompliance } from "@/lib/compliance/state-machine";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ driverId: string }> }
) {
  const { user } = await withAuth({ ensureSignedIn: true });
  if (!user || !(await isAdminUser(user.id))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { driverId } = await params;

  const driver = await prisma.driver.findUnique({
    where: { id: driverId },
    include: {
      documents: {
        where: { entityType: "driver" },
        orderBy: { expiryDate: "asc" },
      },
      memberships: {
        include: { tenant: { select: { id: true, name: true } } },
        orderBy: { addedAt: "desc" },
      },
      vehicleOwnerships: {
        include: {
          vehicle: {
            select: { id: true, plateNumber: true, make: true, model: true, vehicleClass: true },
          },
        },
      },
      submission: true,
      orders: {
        where: { status: "completed" },
        orderBy: { completedAt: "desc" },
        take: 10,
        select: {
          id: true,
          completedAt: true,
          pickupLocation: true,
          dropoffLocation: true,
          tripFare: true,
          tenant: { select: { name: true } },
        },
      },
      _count: { select: { orders: true } },
    },
  });

  if (!driver) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({
    id: driver.id,
    firstName: driver.firstName,
    lastName: driver.lastName,
    phoneNumber: driver.phoneNumber,
    licenseNumber: driver.licenseNumber,
    complianceStatus: driver.complianceStatus,
    tier2Qualified: driver.tier2Qualified,
    sourceType: driver.sourceType,
    createdAt: driver.createdAt.toISOString(),
    documents: driver.documents.map((d) => ({
      id: d.id,
      docType: d.docType,
      status: d.status,
      expiryDate: d.expiryDate.toISOString(),
      issuedDate: d.issuedDate?.toISOString() ?? null,
    })),
    memberships: driver.memberships.map((m) => ({
      id: m.id,
      tenantId: m.tenantId,
      tenantName: m.tenant.name,
      tier1Member: m.tier1Member,
      relationshipType: m.relationshipType,
      addedAt: m.addedAt.toISOString(),
    })),
    vehicles: driver.vehicleOwnerships.map((vo) => ({
      plateNumber: vo.vehicle.plateNumber,
      make: vo.vehicle.make,
      model: vo.vehicle.model,
      vehicleClass: vo.vehicle.vehicleClass,
    })),
    submission: driver.submission
      ? {
          vocationalLicenceNumber: driver.submission.vocationalLicenceNumber,
          vocationalLicenceExpiryDate: driver.submission.vocationalLicenceExpiryDate.toISOString(),
          drivingLicenceNumber: driver.submission.drivingLicenceNumber,
          submittedAt: driver.submission.submittedAt.toISOString(),
        }
      : null,
    recentOrders: driver.orders.map((o) => ({
      id: o.id,
      completedAt: o.completedAt?.toISOString() ?? null,
      pickupLocation: o.pickupLocation,
      dropoffLocation: o.dropoffLocation,
      tripFare: o.tripFare,
      operatorName: o.tenant.name,
    })),
    totalTrips: driver._count.orders,
  });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ driverId: string }> }
) {
  const { user } = await withAuth({ ensureSignedIn: true });
  if (!user || !(await isAdminUser(user.id))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { driverId } = await params;

  const driver = await prisma.driver.findUnique({ where: { id: driverId }, select: { id: true } });
  if (!driver) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json() as {
    firstName?: string;
    lastName?: string;
    phoneNumber?: string;
    licenseNumber?: string;
    licenseIssuedDate?: string | null;
    complianceStatus?: string;
    statusOverrideReason?: string;
    tier2Qualified?: boolean;
  };

  const updates: Record<string, unknown> = {};
  if (body.firstName !== undefined)      updates.firstName      = body.firstName.trim();
  if (body.lastName !== undefined)       updates.lastName       = body.lastName.trim();
  if (body.phoneNumber !== undefined)    updates.phoneNumber    = body.phoneNumber.trim();
  if (body.licenseNumber !== undefined)  updates.licenseNumber  = body.licenseNumber?.trim() || null;
  if (body.licenseIssuedDate !== undefined) {
    updates.licenseIssuedDate = body.licenseIssuedDate ? new Date(body.licenseIssuedDate) : null;
  }
  if (body.tier2Qualified !== undefined) updates.tier2Qualified = body.tier2Qualified;

  const VALID_STATUSES = ["pending", "active", "expiring_soon", "suspended"];
  if (body.complianceStatus !== undefined) {
    if (!VALID_STATUSES.includes(body.complianceStatus)) {
      return NextResponse.json({ error: "Invalid complianceStatus" }, { status: 400 });
    }
    updates.complianceStatus = body.complianceStatus;
  }

  if (!Object.keys(updates).length) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  const updated = await prisma.driver.update({ where: { id: driverId }, data: updates });

  await prisma.auditLog.create({
    data: {
      entityType: "driver",
      entityId: driverId,
      action: "driver_updated",
      actorId: user.id,
      metadata: {
        changes: updates as object,
        ...(body.statusOverrideReason ? { statusOverrideReason: body.statusOverrideReason } : {}),
      } as object,
    },
  });

  if (body.complianceStatus === undefined) {
    await evaluateAndSyncDriverCompliance(driverId, user.id);
  }

  return NextResponse.json({ ok: true, complianceStatus: updated.complianceStatus });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ driverId: string }> }
) {
  const { user } = await withAuth({ ensureSignedIn: true });
  if (!user || !(await isAdminUser(user.id))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { driverId } = await params;

  const driver = await prisma.driver.findUnique({
    where: { id: driverId },
    select: { id: true, deletedAt: true, _count: { select: { orders: true } } },
  });
  if (!driver) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (driver.deletedAt) return NextResponse.json({ error: "Already removed" }, { status: 409 });
  if (driver._count.orders > 0) {
    return NextResponse.json(
      { error: "Cannot remove a driver with existing orders" },
      { status: 422 }
    );
  }

  await prisma.$transaction(async (tx) => {
    await tx.vehicleOwnership.updateMany({
      where: { driverId, terminatedAt: null },
      data: { terminatedAt: new Date(), notes: "Driver removed by admin" },
    });

    await tx.driver.update({
      where: { id: driverId },
      data: { deletedAt: new Date() },
    });

    await tx.auditLog.create({
      data: {
        entityType: "driver",
        entityId: driverId,
        action: "driver_removed",
        actorId: user.id,
        metadata: {},
      },
    });
  });

  return NextResponse.json({ ok: true });
}
