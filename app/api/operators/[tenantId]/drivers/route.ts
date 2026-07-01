import { withAuth } from "@workos-inc/authkit-nextjs";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  await withAuth({ ensureSignedIn: true });
  const { tenantId } = await params;
  const url = new URL(req.url);
  const compliantOnly = url.searchParams.get("compliant") === "true";

  const memberships = await prisma.operatorDriverMembership.findMany({
    where: {
      tenantId,
      tier1Member: true,
      driver: compliantOnly ? { complianceStatus: "active" } : undefined,
    },
    include: {
      driver: {
        include: {
          vehicleOwnerships: {
            where: { terminatedAt: null, vehicle: { deletedAt: null } },
            include: { vehicle: { select: { plateNumber: true, make: true, model: true } } },
            take: 1,
          },
        },
      },
    },
    orderBy: [
      { driver: { tier2Qualified: "desc" } },
      { driver: { lastName: "asc" } },
    ],
  });

  const drivers = memberships.map(m => ({
    id: m.driver.id,
    firstName: m.driver.firstName,
    lastName: m.driver.lastName,
    tier2Qualified: m.driver.tier2Qualified,
    complianceStatus: m.driver.complianceStatus,
    vehicleOwnerships: m.driver.vehicleOwnerships,
  }));

  return Response.json({ drivers });
}
