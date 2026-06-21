import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus } from "lucide-react";

const statusColors: Record<string, string> = {
  active: "bg-green-900 text-green-300 border-green-700",
  inactive: "bg-gray-800 text-gray-400 border-gray-700",
  suspended: "bg-red-900 text-red-300 border-red-700",
};

export default async function VehiclesPage() {
  const vehicles = await prisma.vehicle.findMany({
    orderBy: { plateNumber: "asc" },
    include: {
      _count: { select: { documents: true } },
      ownership: {
        include: { driver: { select: { firstName: true, lastName: true } } },
        take: 1,
      },
    },
  });

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-white">Vehicles</h1>
          <p className="text-sm text-gray-500 mt-1">Global vehicle registry</p>
        </div>
        <Link href="/vehicles/new">
          <Button size="sm" className="gap-1.5">
            <Plus size={14} />
            Add Vehicle
          </Button>
        </Link>
      </div>

      <div className="rounded-md border border-gray-800 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-gray-800 hover:bg-transparent">
              <TableHead className="text-gray-400">Plate</TableHead>
              <TableHead className="text-gray-400">Make / Model</TableHead>
              <TableHead className="text-gray-400">Status</TableHead>
              <TableHead className="text-gray-400">Primary Driver</TableHead>
              <TableHead className="text-gray-400">Docs</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {vehicles.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-gray-600 py-12">
                  No vehicles registered
                </TableCell>
              </TableRow>
            )}
            {vehicles.map((v) => {
              const primaryOwner = v.ownership[0];
              return (
                <TableRow key={v.id} className="border-gray-800 hover:bg-gray-900">
                  <TableCell>
                    <Link href={`/vehicles/${v.id}`} className="text-white hover:underline font-mono text-sm">
                      {v.plateNumber}
                    </Link>
                  </TableCell>
                  <TableCell className="text-gray-300 text-sm">
                    {v.make} {v.model}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`text-xs ${statusColors[v.status]}`}>
                      {v.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-gray-400 text-sm">
                    {primaryOwner
                      ? `${primaryOwner.driver.firstName} ${primaryOwner.driver.lastName}`
                      : <span className="text-gray-600">—</span>}
                  </TableCell>
                  <TableCell className="text-gray-400 text-sm">{v._count.documents}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
