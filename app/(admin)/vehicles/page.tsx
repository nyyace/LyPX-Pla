import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { ExcelActions } from "@/components/admin/ExcelActions";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const STATUS_CHIP: Record<string, string> = {
  active:    "chip chip-green",
  inactive:  "chip chip-dim",
  suspended: "chip chip-red",
};

function fmtDate(d: Date) {
  return d.toLocaleDateString("en-SG", { year: "numeric", month: "short", day: "numeric" });
}

export default async function VehiclesPage() {
  const vehicles = await prisma.vehicle.findMany({
    where: { deletedAt: null },
    orderBy: { plateNumber: "asc" },
    select: {
      id:           true,
      plateNumber:  true,
      make:         true,
      model:        true,
      year:         true,
      vehicleClass: true,
      status:       true,
      registeredByTenant: { select: { name: true } },
      documents: {
        where:   { docType: "insurance", status: "verified" },
        select:  { expiryDate: true },
        orderBy: { expiryDate: "desc" },
        take:    1,
      },
      ownership: {
        where:  { terminatedAt: null },
        select: {
          relationshipType: true,
          contractExpiry:   true,
          verifiedAt:       true,
          driver: { select: { firstName: true, lastName: true } },
        },
        take: 1,
      },
    },
  });

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-white">Vehicles</h1>
          <p className="text-sm text-gray-500 mt-1">
            {vehicles.length} vehicle{vehicles.length !== 1 ? "s" : ""} in registry
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ExcelActions entityType="vehicles" />
          <Link href="/vehicles/new">
            <Button size="sm" className="gap-1.5">
              <Plus size={14} />
              Add Vehicle
            </Button>
          </Link>
        </div>
      </div>

      <div className="rounded-md border border-gray-800 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-gray-800 hover:bg-transparent">
              <TableHead className="text-gray-400">Plate</TableHead>
              <TableHead className="text-gray-400">Make / Model</TableHead>
              <TableHead className="text-gray-400">Class</TableHead>
              <TableHead className="text-gray-400">Status</TableHead>
              <TableHead className="text-gray-400">Insurance Expiry</TableHead>
              <TableHead className="text-gray-400">Current Driver</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {vehicles.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12" style={{ color: "var(--text-faint)" }}>
                  No vehicles registered
                </TableCell>
              </TableRow>
            )}
            {vehicles.map((v) => {
              const driver    = v.ownership[0]?.driver;
              const insurance = v.documents[0];

              const daysToExpiry = insurance
                ? Math.floor(
                    (new Date(insurance.expiryDate).getTime() - Date.now()) /
                    (1000 * 60 * 60 * 24)
                  )
                : null;

              const expiryColor =
                daysToExpiry === null  ? "var(--text-faint)" :
                daysToExpiry < 0       ? "var(--red)"        :
                daysToExpiry < 30      ? "#E5A93C"           :
                                         "#4CAF6D";

              const expiryBold = daysToExpiry !== null && daysToExpiry < 30;

              return (
                <TableRow key={v.id} className="border-gray-800 hover:bg-gray-900">
                  <TableCell>
                    <Link
                      href={`/vehicles/${v.id}`}
                      className="font-mono text-sm text-white hover:underline"
                    >
                      {v.plateNumber}
                    </Link>
                  </TableCell>

                  <TableCell className="text-gray-300 text-sm">
                    {v.make} {v.model}{v.year ? ` (${v.year})` : ""}
                  </TableCell>

                  <TableCell className="text-sm" style={{ color: "var(--text-dim)" }}>
                    {v.vehicleClass ?? <span style={{ color: "var(--text-faint)" }}>—</span>}
                  </TableCell>

                  <TableCell>
                    <span className={STATUS_CHIP[v.status] ?? "chip chip-dim"}>
                      {v.status}
                    </span>
                  </TableCell>

                  <TableCell className="text-sm">
                    {insurance ? (
                      <span style={{ color: expiryColor, fontWeight: expiryBold ? 500 : undefined }}>
                        {fmtDate(insurance.expiryDate)}
                        {daysToExpiry !== null && daysToExpiry >= 0 && daysToExpiry < 30 && (
                          <span className="ml-1 text-xs">({daysToExpiry}d)</span>
                        )}
                        {daysToExpiry !== null && daysToExpiry < 0 && (
                          <span className="ml-1 text-xs">({Math.abs(daysToExpiry)}d overdue)</span>
                        )}
                      </span>
                    ) : (
                      <span style={{ color: "var(--text-faint)" }}>—</span>
                    )}
                  </TableCell>

                  <TableCell className="text-sm" style={{ color: "var(--text-dim)" }}>
                    {driver
                      ? `${driver.firstName} ${driver.lastName}`
                      : <span style={{ color: "var(--text-faint)" }}>—</span>}
                  </TableCell>

                  <TableCell className="text-right">
                    <Link href={`/vehicles/${v.id}`}>
                      <Button variant="ghost" size="sm">View</Button>
                    </Link>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
