import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { withAuth } from "@workos-inc/authkit-nextjs";
import { getUserTimezone } from "@/lib/utils/timezone";
import { formatTZDate } from "@/lib/utils/date";

const statusBadge: Record<string, string> = {
  pending: "border-yellow-700 text-yellow-300",
  conditional: "border-blue-700 text-blue-300",
  approved: "border-green-700 text-green-300",
  denied: "border-red-700 text-red-300",
};

export default async function TakeoverRequestsPage({
  searchParams,
}: {
  searchParams: { status?: string };
}) {
  const params = await searchParams;
  const { user } = await withAuth({ ensureSignedIn: true });
  const tz = await getUserTimezone(user.id);

  const status = params.status ?? "pending";

  const requests = await prisma.takeoverRequest.findMany({
    where: { status },
    orderBy: { requestedAt: "desc" },
    include: { account: { select: { name: true, customerSegment: true } } },
  });

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-white">Takeover Requests</h1>
        <p className="text-sm text-gray-500 mt-1">Account ownership dispute queue</p>
      </div>

      {/* Status tabs */}
      <div className="flex gap-2 mb-4">
        {["pending", "conditional", "approved", "denied"].map((s) => (
          <Link
            key={s}
            href={`/takeover-requests?status=${s}`}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              status === s ? "bg-gray-700 text-white" : "text-gray-500 hover:text-gray-300"
            }`}
          >
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </Link>
        ))}
      </div>

      <div className="rounded-md border border-gray-800 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-gray-800 hover:bg-transparent">
              <TableHead className="text-gray-400">Account</TableHead>
              <TableHead className="text-gray-400">Requestor</TableHead>
              <TableHead className="text-gray-400">Current Owner</TableHead>
              <TableHead className="text-gray-400">Score</TableHead>
              <TableHead className="text-gray-400">Status</TableHead>
              <TableHead className="text-gray-400">Requested</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {requests.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-gray-600 py-12">
                  No {status} requests
                </TableCell>
              </TableRow>
            )}
            {requests.map((r) => (
              <TableRow key={r.id} className="border-gray-800 hover:bg-gray-900">
                <TableCell>
                  <Link href={`/takeover-requests/${r.id}`} className="text-white hover:underline text-sm">
                    {r.account.name}
                  </Link>
                  <p className="text-xs text-gray-500">{r.account.customerSegment}</p>
                </TableCell>
                <TableCell className="text-gray-300 text-sm">{r.requestingPartyType}</TableCell>
                <TableCell className="text-gray-300 text-sm">{r.currentOwnerType}</TableCell>
                <TableCell className="text-gray-400 text-sm">
                  {r.score != null ? `${r.score}/100` : "—"}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={`text-xs ${statusBadge[r.status]}`}>
                    {r.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-gray-500 text-xs">
                  {formatTZDate(r.requestedAt, tz)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
