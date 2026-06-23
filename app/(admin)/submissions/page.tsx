import { prisma } from "@/lib/prisma";
import { withAuth } from "@workos-inc/authkit-nextjs";
import { getUserTimezone } from "@/lib/utils/timezone";
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
import { formatTZDate, DEFAULT_TIMEZONE } from "@/lib/utils/date";

function deriveStatus(s: { reviewedAt: Date | null; rejectionReason: string | null; flagReason: string | null }) {
  if (!s.reviewedAt) return "pending";
  if (s.rejectionReason) return "rejected";
  if (s.flagReason) return "flagged";
  return "approved";
}

const statusStyles: Record<string, string> = {
  pending:  "border-yellow-700 text-yellow-300",
  approved: "border-green-700 text-green-300",
  rejected: "border-red-700 text-red-300",
  flagged:  "border-orange-700 text-orange-300",
};

export default async function SubmissionsPage() {
  const { user } = await withAuth({ ensureSignedIn: true });
  const tz = await getUserTimezone(user.id);

  const submissions = await prisma.driverSubmission.findMany({
    orderBy: { submittedAt: "desc" },
    include: {
      driver: { select: { complianceStatus: true } },
    },
  });

  const counts = submissions.reduce<Record<string, number>>((acc, s) => {
    const status = deriveStatus(s);
    acc[status] = (acc[status] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-white">Driver Submissions</h1>
        <p className="text-sm text-gray-500 mt-1">
          {counts.pending ?? 0} pending · {counts.approved ?? 0} approved · {counts.rejected ?? 0} rejected · {counts.flagged ?? 0} flagged
        </p>
      </div>

      {submissions.length === 0 ? (
        <p className="text-gray-600 text-sm">No submissions yet.</p>
      ) : (
        <div className="rounded-md border border-gray-800 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-gray-800 hover:bg-transparent bg-gray-900/50">
                <TableHead className="text-gray-400">Applicant</TableHead>
                <TableHead className="text-gray-400">Phone</TableHead>
                <TableHead className="text-gray-400">Vehicle</TableHead>
                <TableHead className="text-gray-400">Submitted</TableHead>
                <TableHead className="text-gray-400">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {submissions.map((s) => {
                const status = deriveStatus(s);
                return (
                  <TableRow key={s.id} className="border-gray-800 hover:bg-gray-900">
                    <TableCell>
                      <Link
                        href={`/submissions/${s.id}`}
                        className="text-white hover:underline text-sm font-medium"
                      >
                        {s.firstName} {s.lastName}
                      </Link>
                      <p className="text-xs text-gray-500 mt-0.5">{s.nricNumber}</p>
                    </TableCell>
                    <TableCell className="text-sm text-gray-300">{s.phoneNumber}</TableCell>
                    <TableCell className="text-sm text-gray-300">
                      {s.vehiclePlate ?? <span className="text-gray-600">—</span>}
                    </TableCell>
                    <TableCell className="text-xs text-gray-500">
                      {formatTZDate(s.submittedAt, tz ?? DEFAULT_TIMEZONE)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-xs ${statusStyles[status]}`}>
                        {status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
