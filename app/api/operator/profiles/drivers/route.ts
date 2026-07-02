import { withAuth } from "@workos-inc/authkit-nextjs";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getOperatorTenant } from "@/lib/utils/operator";

export async function GET() {
  const { user } = await withAuth({ ensureSignedIn: true });
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tenant = await getOperatorTenant(user.id);
  if (!tenant) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const memberships = await prisma.operatorDriverMembership.findMany({
    where: { tenantId: tenant.id, tier1Member: true },
    include: {
      driver: {
        include: {
          vehicleOwnerships: {
            where: { terminatedAt: null, vehicle: { deletedAt: null } },
            include: {
              vehicle: { select: { plateNumber: true, make: true, model: true, vehicleClass: true } },
            },
            take: 1,
          },
          orders: {
            where: { tenantId: tenant.id, status: "completed", completedAt: { gte: thirtyDaysAgo } },
            select: { id: true },
          },
          submission: {
            select: { vocationalLicenceNumber: true, vocationalLicenceExpiryDate: true },
          },
        },
      },
    },
    orderBy: { addedAt: "desc" },
  });

  const drivers = memberships.map((m) => ({
    id: m.driver.id,
    firstName: m.driver.firstName,
    lastName: m.driver.lastName,
    phoneNumber: m.driver.phoneNumber,
    complianceStatus: m.driver.complianceStatus,
    tier1Member: m.tier1Member,
    centralPoolEligible: m.driver.centralPoolEligible,
    vehicleClass: m.driver.vehicleOwnerships[0]?.vehicle.vehicleClass ?? null,
    vehicle: m.driver.vehicleOwnerships[0]?.vehicle ?? null,
    vocationalLicenceExpiry: m.driver.submission?.vocationalLicenceExpiryDate?.toISOString() ?? null,
    tripCount30d: m.driver.orders.length,
  }));

  return NextResponse.json(drivers);
}
