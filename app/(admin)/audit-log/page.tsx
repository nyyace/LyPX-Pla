import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import Link from "next/link";
import { withAuth } from "@workos-inc/authkit-nextjs";
import { getUserTimezone } from "@/lib/utils/timezone";
import { formatTZ } from "@/lib/utils/date";

const entityColors: Record<string, string> = {
  compliance: "border-blue-700 text-blue-300",
  account_claim: "border-yellow-700 text-yellow-300",
  order: "border-green-700 text-green-300",
  takeover_request: "border-purple-700 text-purple-300",
  driver: "border-gray-700 text-gray-400",
  vehicle: "border-gray-700 text-gray-400",
  user_preference: "border-gray-700 text-gray-400",
};

export default async function AuditLogPage({
  searchParams,
}: {
  searchParams: { entityType?: string; page?: string };
}) {
  const params = await searchParams;
  const { user } = await withAuth({ ensureSignedIn: true });
  const tz = await getUserTimezone(user.id);

  const page = Math.max(1, parseInt(params.page ?? "1"));
  const limit = 50;

  const whereFilter = params.entityType ? { entityType: params.entityType } : {};

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where: whereFilter,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.auditLog.count({ where: whereFilter }),
  ]);

  const totalPages = Math.ceil(total / limit);
  const entityTypes = ["compliance", "account_claim", "order", "takeover_request", "driver", "vehicle"];

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-white">Audit Log</h1>
        <p className="text-sm text-gray-500 mt-1">{total.toLocaleString()} entries — immutable record</p>
      </div>

      {/* Entity type filter */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <Link
          href="/audit-log"
          className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
            !params.entityType ? "bg-gray-700 text-white" : "text-gray-500 hover:text-gray-300"
          }`}
        >
          All
        </Link>
        {entityTypes.map((t) => (
          <Link
            key={t}
            href={`/audit-log?entityType=${t}`}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              params.entityType === t ? "bg-gray-700 text-white" : "text-gray-500 hover:text-gray-300"
            }`}
          >
            {t.replace("_", " ")}
          </Link>
        ))}
      </div>

      <div className="rounded-md border border-gray-800 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-gray-800 hover:bg-transparent">
              <TableHead className="text-gray-400">Time</TableHead>
              <TableHead className="text-gray-400">Entity</TableHead>
              <TableHead className="text-gray-400">Action</TableHead>
              <TableHead className="text-gray-400">Actor</TableHead>
              <TableHead className="text-gray-400">Metadata</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-gray-600 py-12">
                  No audit entries yet
                </TableCell>
              </TableRow>
            )}
            {logs.map((log) => (
              <TableRow key={log.id} className="border-gray-800 hover:bg-gray-900">
                <TableCell className="text-gray-500 text-xs whitespace-nowrap">
                  {formatTZ(log.createdAt, tz, { dateStyle: "medium", timeStyle: "medium" })}
                </TableCell>
                <TableCell>
                  <div>
                    <Badge variant="outline" className={`text-xs mb-1 ${entityColors[log.entityType] ?? "border-gray-700 text-gray-400"}`}>
                      {log.entityType.replace("_", " ")}
                    </Badge>
                    <p className="text-xs text-gray-600 font-mono">{log.entityId.slice(0, 12)}…</p>
                  </div>
                </TableCell>
                <TableCell className="text-gray-300 text-sm font-mono">{log.action}</TableCell>
                <TableCell className="text-gray-500 text-xs">{log.actorId ?? "—"}</TableCell>
                <TableCell>
                  {log.metadata && (
                    <pre className="text-xs text-gray-600 max-w-xs overflow-hidden truncate">
                      {JSON.stringify(log.metadata)}
                    </pre>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 text-sm text-gray-500">
          <span>Page {page} of {totalPages}</span>
          <div className="flex gap-2">
            {page > 1 && (
              <Link
                href={`/audit-log?${params.entityType ? `entityType=${params.entityType}&` : ""}page=${page - 1}`}
                className="px-3 py-1 rounded border border-gray-800 hover:bg-gray-900 text-gray-400"
              >
                Previous
              </Link>
            )}
            {page < totalPages && (
              <Link
                href={`/audit-log?${params.entityType ? `entityType=${params.entityType}&` : ""}page=${page + 1}`}
                className="px-3 py-1 rounded border border-gray-800 hover:bg-gray-900 text-gray-400"
              >
                Next
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
