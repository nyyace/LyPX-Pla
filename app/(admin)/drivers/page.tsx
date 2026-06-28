import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { AdminDriversClient } from "@/components/profiles/AdminDriversClient";

export default async function DriversPage() {
  const drivers = await prisma.driver.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      memberships: {
        include: { tenant: { select: { name: true } } },
      },
      vehicleOwnerships: {
        include: {
          vehicle: { select: { plateNumber: true, vehicleClass: true } },
        },
        take: 1,
      },
      _count: { select: { orders: true } },
    },
  });

  const list = drivers.map((d) => ({
    id: d.id,
    firstName: d.firstName,
    lastName: d.lastName,
    phoneNumber: d.phoneNumber,
    complianceStatus: d.complianceStatus,
    tier2Qualified: d.tier2Qualified,
    vehicleClass: d.vehicleOwnerships[0]?.vehicle.vehicleClass ?? null,
    plateNumber: d.vehicleOwnerships[0]?.vehicle.plateNumber ?? null,
    operatorNames: d.memberships.map((m) => m.tenant.name),
    totalTrips: d._count.orders,
  }));

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div style={{ padding: "20px 24px 16px", borderBottom: "1px solid var(--border)", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: "var(--text)", margin: 0 }}>Drivers</h1>
          <p style={{ fontSize: 12, color: "var(--text-dim)", margin: "4px 0 0" }}>
            {list.length} driver{list.length !== 1 ? "s" : ""} on platform
          </p>
        </div>
        <Link href="/drivers/new">
          <Button size="sm" className="gap-1.5">
            <Plus size={14} />
            Add Driver
          </Button>
        </Link>
      </div>
      <div style={{ flex: 1, overflow: "hidden" }}>
        <AdminDriversClient drivers={list} />
      </div>
    </div>
  );
}
