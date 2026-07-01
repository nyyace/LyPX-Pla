import { withAuth } from "@workos-inc/authkit-nextjs";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getOperatorTenant } from "@/lib/utils/operator";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ driverId: string }> }
) {
  const { user } = await withAuth({ ensureSignedIn: true });
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tenant = await getOperatorTenant(user.id);
  if (!tenant) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { driverId } = await params;

  const membership = await prisma.operatorDriverMembership.findUnique({
    where: { tenantId_driverId: { tenantId: tenant.id, driverId } },
    include: {
      driver: {
        include: {
          documents: {
            where: { entityType: "driver" },
            orderBy: { expiryDate: "asc" },
          },
          vehicleOwnerships: {
            where: { terminatedAt: null, vehicle: { deletedAt: null } },
            include: {
              vehicle: {
                select: { id: true, plateNumber: true, make: true, model: true, vehicleClass: true },
              },
            },
            take: 1,
          },
          submission: {
            select: {
              vocationalLicenceNumber: true,
              vocationalLicenceExpiryDate: true,
              drivingLicenceNumber: true,
            },
          },
        },
      },
    },
  });

  if (!membership) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [recentOrders, monthOrders] = await Promise.all([
    prisma.order.findMany({
      where: { driverId, tenantId: tenant.id, status: "completed", completedAt: { gte: thirtyDaysAgo } },
      orderBy: { completedAt: "desc" },
      take: 20,
      select: {
        id: true,
        completedAt: true,
        pickupLocation: true,
        dropoffLocation: true,
        tripFare: true,
      },
    }),
    prisma.order.findMany({
      where: { driverId, tenantId: tenant.id, status: "completed", completedAt: { gte: startOfMonth } },
      select: { tripFare: true },
    }),
  ]);

  const earningsThisMonth = monthOrders.reduce((sum, o) => sum + (o.tripFare ?? 0), 0);
  const d = membership.driver;

  return NextResponse.json({
    id: d.id,
    firstName: d.firstName,
    lastName: d.lastName,
    phoneNumber: d.phoneNumber,
    complianceStatus: d.complianceStatus,
    tier1Member: membership.tier1Member,
    tier2Qualified: d.tier2Qualified,
    addedAt: membership.addedAt.toISOString(),
    licenceNumber: d.submission?.drivingLicenceNumber ?? d.licenseNumber ?? null,
    vocationalLicenceNumber: d.submission?.vocationalLicenceNumber ?? null,
    vocationalLicenceExpiry: d.submission?.vocationalLicenceExpiryDate?.toISOString() ?? null,
    documents: d.documents.map((doc) => ({
      id: doc.id,
      docType: doc.docType,
      status: doc.status,
      expiryDate:      doc.expiryDate?.toISOString() ?? null,
      issuedDate:      doc.issuedDate?.toISOString() ?? null,
      referenceNumber: doc.referenceNumber ?? null,
    })),
    vehicle: d.vehicleOwnerships[0]?.vehicle ?? null,
    recentOrders: recentOrders.map((o) => ({
      id: o.id,
      completedAt: o.completedAt?.toISOString() ?? null,
      pickupLocation: o.pickupLocation,
      dropoffLocation: o.dropoffLocation,
      tripFare: o.tripFare,
    })),
    tripCount30d: recentOrders.length,
    earningsThisMonth,
  });
}
