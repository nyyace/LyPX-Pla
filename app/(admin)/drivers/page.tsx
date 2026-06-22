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
import { withAuth } from "@workos-inc/authkit-nextjs";
import { getUserTimezone } from "@/lib/utils/timezone";
import { formatTZDate } from "@/lib/utils/date";

const statusColors: Record<string, string> = {
  active: "bg-green-900 text-green-300 border-green-700",
  expiring_soon: "bg-yellow-900 text-yellow-300 border-yellow-700",
  suspended: "bg-red-900 text-red-300 border-red-700",
  pending: "bg-gray-800 text-gray-400 border-gray-700",
};

export default async function DriversPage({
  searchParams,
}: {
  searchParams: { status?: string; q?: string };
}) {
  const params = await searchParams;
  const { user } = await withAuth({ ensureSignedIn: true });
  const tz = await getUserTimezone(user.id);

  const drivers = await prisma.driver.findMany({
    where: {
      ...(params.status ? { complianceStatus: params.status } : {}),
      ...(params.q
        ? {
            OR: [
              { firstName: { contains: params.q, mode: "insensitive" } },
              { lastName: { contains: params.q, mode: "insensitive" } },
              { phoneNumber: { contains: params.q } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { documents: true } } },
  });

  const counts = await prisma.driver.groupBy({
    by: ["complianceStatus"],
    _count: true,
  });
  const countMap = Object.fromEntries(
    counts.map((c) => [c.complianceStatus, c._count])
  );

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-white">Drivers</h1>
          <p className="text-sm text-gray-500 mt-1">Global driver registry</p>
        </div>
        <Link href="/drivers/new">
          <Button size="sm" className="gap-1.5">
            <Plus size={14} />
            Add Driver
          </Button>
        </Link>
      </div>

      {/* Status filter tabs */}
      <div className="flex gap-2 mb-4">
        {[null, "active", "expiring_soon", "suspended", "pending"].map((s) => (
          <Link
            key={s ?? "all"}
            href={s ? `/drivers?status=${s}` : "/drivers"}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              params.status === s || (!s && !params.status)
                ? "bg-gray-700 text-white"
                : "text-gray-500 hover:text-gray-300"
            }`}
          >
            {s === null
              ? `All (${drivers.length})`
              : `${s.replace("_", " ")} (${countMap[s] ?? 0})`}
          </Link>
        ))}
      </div>

      <div className="rounded-md border border-gray-800 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-gray-800 hover:bg-transparent">
              <TableHead className="text-gray-400">Name</TableHead>
              <TableHead className="text-gray-400">Phone</TableHead>
              <TableHead className="text-gray-400">Status</TableHead>
              <TableHead className="text-gray-400">Tier 2</TableHead>
              <TableHead className="text-gray-400">Docs</TableHead>
              <TableHead className="text-gray-400">Added</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {drivers.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-gray-600 py-12">
                  No drivers found
                </TableCell>
              </TableRow>
            )}
            {drivers.map((d) => (
              <TableRow
                key={d.id}
                className="border-gray-800 hover:bg-gray-900 cursor-pointer"
              >
                <TableCell>
                  <Link href={`/drivers/${d.id}`} className="text-white hover:underline">
                    {d.firstName} {d.lastName}
                  </Link>
                </TableCell>
                <TableCell className="text-gray-400 text-sm">{d.phoneNumber}</TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={`text-xs ${statusColors[d.complianceStatus]}`}
                  >
                    {d.complianceStatus.replace("_", " ")}
                  </Badge>
                </TableCell>
                <TableCell className="text-gray-400 text-sm">
                  {d.tier2Qualified ? "Yes" : "—"}
                </TableCell>
                <TableCell className="text-gray-400 text-sm">
                  {d._count.documents}
                </TableCell>
                <TableCell className="text-gray-500 text-xs">
                  {formatTZDate(d.createdAt, tz)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
