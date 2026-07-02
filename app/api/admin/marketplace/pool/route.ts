import { withAuth } from "@workos-inc/authkit-nextjs";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { isAdminUser } from "@/lib/utils/admin";

const ACTIVE_JOB_STATUSES = ["en_route", "arrived", "started"] as const;

export async function GET(req: Request) {
  const { user } = await withAuth({ ensureSignedIn: true });
  if (!user || !(await isAdminUser(user.id))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const filterOperatorId = searchParams.get("operatorId");
  const filterVehicleClass = searchParams.get("vehicleClass");

  const operators = await prisma.tenant.findMany({
    where: {
      marketplaceParticipation: true,
      status: "active",
      ...(filterOperatorId ? { id: filterOperatorId } : {}),
    },
    include: {
      driverMemberships: {
        include: {
          driver: {
            include: {
              vehicleOwnerships: {
                where: { contractStatus: { not: "terminated" } },
                include: {
                  vehicle: {
                    select: { plateNumber: true, make: true, model: true, vehicleClass: true },
                  },
                },
                orderBy: { createdAt: "desc" },
                take: 1,
              },
              orders: {
                where: { status: { in: [...ACTIVE_JOB_STATUSES] } },
                select: { id: true, pickupTime: true, status: true },
                take: 1,
              },
            },
          },
        },
      },
    },
    orderBy: { name: "asc" },
  });

  let totalDrivers = 0;
  let availableDrivers = 0;
  let onJobDrivers = 0;
  let suspendedDrivers = 0;

  const operatorRows = operators.map((op) => {
    const drivers = op.driverMemberships
      .map((m) => {
        const driver = m.driver;
        const vehicle = driver.vehicleOwnerships[0]?.vehicle ?? null;
        const activeOrder = driver.orders[0] ?? null;

        if (filterVehicleClass && vehicle?.vehicleClass !== filterVehicleClass) return null;

        const tier = m.tier1Member ? "T1" : driver.centralPoolEligible ? "T3" : null;

        let availability: "available" | "on_job" | "suspended";
        if (driver.complianceStatus === "suspended") {
          availability = "suspended";
        } else if (activeOrder) {
          availability = "on_job";
        } else {
          availability = "available";
        }

        // Estimate free time: pickupTime + 2h as rough approximation
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
          tier,
          complianceStatus: driver.complianceStatus,
          vehicle: vehicle
            ? {
                plate: vehicle.plateNumber,
                make: vehicle.make,
                model: vehicle.model,
                class: vehicle.vehicleClass ?? null,
              }
            : null,
          availability,
          currentJobRef: activeOrder ? `LYP-${activeOrder.id.slice(-4).toUpperCase()}` : null,
          estimatedFreeAt,
        };
      })
      .filter(Boolean);

    return {
      tenantId: op.id,
      name: op.name,
      driverCount: drivers.length,
      availableCount: drivers.filter((d) => d?.availability === "available").length,
      drivers,
    };
  }).filter((op) => op.drivers.length > 0 || !filterVehicleClass);

  return NextResponse.json({
    operators: operatorRows,
    summary: {
      totalParticipatingOperators: operators.length,
      totalDrivers,
      availableDrivers,
      onJobDrivers,
      suspendedDrivers,
    },
  });
}
