import { prisma } from "@/lib/prisma";
import { withAuth } from "@workos-inc/authkit-nextjs";
import { getOperatorTenant } from "@/lib/utils/operator";
import { redirect } from "next/navigation";
import { MarketplacePoolClient } from "@/components/marketplace/MarketplacePoolClient";

const ACTIVE_JOB_STATUSES = ["en_route", "arrived", "started"] as const;

async function getPoolData() {
  const operators = await prisma.tenant.findMany({
    where: { marketplaceParticipation: true, status: "active" },
    include: {
      driverMemberships: {
        include: {
          driver: {
            include: {
              vehicleOwnerships: {
                where: { contractStatus: { not: "terminated" } },
                include: { vehicle: { select: { plateNumber: true, make: true, model: true, vehicleClass: true } } },
                orderBy: { createdAt: "desc" },
                take: 1,
              },
              orders: {
                where: { status: { in: [...ACTIVE_JOB_STATUSES] } },
                select: { id: true, pickupTime: true },
                take: 1,
              },
            },
          },
        },
      },
    },
    orderBy: { name: "asc" },
  });

  let totalDrivers = 0, availableDrivers = 0, onJobDrivers = 0, suspendedDrivers = 0;

  const operatorRows = operators.map((op) => {
    const drivers = op.driverMemberships.map((m) => {
      const driver = m.driver;
      const vehicle = driver.vehicleOwnerships[0]?.vehicle ?? null;
      const activeOrder = driver.orders[0] ?? null;
      const tier = m.tier1Member ? "T1" : driver.centralPoolEligible ? "T3" : null;
      const availability: "available" | "on_job" | "suspended" =
        driver.complianceStatus === "suspended" ? "suspended"
        : activeOrder ? "on_job"
        : "available";

      let estimatedFreeAt: string | null = null;
      if (activeOrder) {
        const est = new Date(activeOrder.pickupTime);
        est.setHours(est.getHours() + 2);
        estimatedFreeAt = est.toISOString();
      }

      totalDrivers++;
      if (availability === "available") availableDrivers++;
      else if (availability === "on_job") onJobDrivers++;
      else suspendedDrivers++;

      return {
        driverId: driver.id,
        firstName: driver.firstName,
        lastName: driver.lastName,
        tier: tier as "T1" | "T3" | null,
        complianceStatus: driver.complianceStatus,
        vehicle: vehicle ? { plate: vehicle.plateNumber, make: vehicle.make, model: vehicle.model, class: vehicle.vehicleClass } : null,
        availability,
        currentJobRef: activeOrder ? `LYP-${activeOrder.id.slice(-4).toUpperCase()}` : null,
        estimatedFreeAt,
      };
    });

    return { tenantId: op.id, name: op.name, driverCount: drivers.length, availableCount: drivers.filter((d) => d.availability === "available").length, drivers };
  });

  return {
    operators: operatorRows,
    summary: { totalParticipatingOperators: operators.length, totalDrivers, availableDrivers, onJobDrivers, suspendedDrivers },
  };
}

export default async function MarketplacePage() {
  const { user } = await withAuth({ ensureSignedIn: true });
  if (await getOperatorTenant(user.id)) redirect("/operator/dispatch");

  const initialData = await getPoolData();

  return (
    <div>
      <div style={{ padding: "28px 40px 0", borderBottom: "1px solid var(--border)" }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: "var(--text)", margin: "0 0 4px" }}>Marketplace Pool</h1>
        <p style={{ fontSize: 12, color: "var(--text-dim)", margin: "0 0 20px" }}>
          Real-time driver availability across participating operators — refreshes every 30 seconds.
        </p>
      </div>
      <MarketplacePoolClient initialData={initialData} />
    </div>
  );
}
