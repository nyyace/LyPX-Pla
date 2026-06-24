import { withAuth } from "@workos-inc/authkit-nextjs";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { isAdminUser } from "@/lib/utils/admin";

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
