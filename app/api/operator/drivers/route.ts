import { NextResponse } from "next/server";
import { withAuth } from "@workos-inc/authkit-nextjs";
import { prisma } from "@/lib/prisma";
import { getOperatorTenant } from "@/lib/utils/operator";

const ACTIVE_ORDER_STATUSES = ["booked", "assigned", "en_route", "arrived", "started"];

export async function GET() {
  const { user } = await withAuth({ ensureSignedIn: true });
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tenant = await getOperatorTenant(user.id);
  if (!tenant) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const memberships = await prisma.operatorDriverMembership.findMany({
    where: { tenantId: tenant.id },
    include: {
      driver: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          phoneNumber: true,
          licenseNumber: true,
          complianceStatus: true,
          tier2Qualified: true,
          _count: {
            select: {
              orders: {
                where: { status: { in: ACTIVE_ORDER_STATUSES } },
              },
            },
          },
        },
      },
    },
    orderBy: { addedAt: "desc" },
  });

  const roster = memberships.map((m) => ({
    driverId: m.driverId,
    firstName: m.driver.firstName,
    lastName: m.driver.lastName,
    phoneNumber: m.driver.phoneNumber,
    licenseNumber: m.driver.licenseNumber,
    complianceStatus: m.driver.complianceStatus,
    tier2Qualified: m.driver.tier2Qualified,
    relationshipType: m.relationshipType,
    tier1Member: m.tier1Member,
    addedAt: m.addedAt.toISOString(),
    activeJobCount: m.driver._count.orders,
  }));

  return NextResponse.json(roster);
}
