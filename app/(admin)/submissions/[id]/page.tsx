import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { withAuth } from "@workos-inc/authkit-nextjs";
import { getUserTimezone } from "@/lib/utils/timezone";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ComplianceDocumentList } from "@/components/compliance/ComplianceDocumentList";
import { SubmissionReviewActions } from "@/components/submissions/SubmissionReviewActions";
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

export default async function SubmissionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { user } = await withAuth({ ensureSignedIn: true });
  const tz = await getUserTimezone(user.id);
  const timezone = tz ?? DEFAULT_TIMEZONE;

  const submission = await prisma.driverSubmission.findUnique({
    where: { id },
    include: {
      driver: {
        include: {
          documents: {
            orderBy: { uploadedAt: "asc" },
            include: { file: { select: { fileName: true, mimeType: true } } },
          },
          vehicleOwnerships: {
            include: {
              vehicle: {
                include: {
                  documents: {
                    orderBy: { uploadedAt: "asc" },
                    include: { file: { select: { fileName: true, mimeType: true } } },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!submission) notFound();

  const { driver } = submission;
  const status = deriveStatus(submission);

  return (
    <div className="p-8 max-w-3xl">
      <div className="mb-6">
        <Link href="/submissions" className="text-xs text-gray-500 hover:text-gray-300 mb-3 block">
          ← Submissions
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-white">{submission.fullName}</h1>
            <p className="text-sm text-gray-500 mt-1">
              Submitted {formatTZDate(submission.submittedAt, timezone)}
            </p>
          </div>
          <Badge variant="outline" className={`text-sm ${statusStyles[status]}`}>
            {status}
          </Badge>
        </div>
      </div>

      {/* Review actions */}
      <Card className="bg-gray-900 border-gray-800 mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm text-gray-300">Review Decision</CardTitle>
        </CardHeader>
        <CardContent>
          {status !== "pending" && (
            <div className="mb-4 space-y-1 text-xs text-gray-500">
              <p>Reviewed by <span className="text-gray-300">{submission.reviewedBy}</span> on {formatTZDate(submission.reviewedAt!, timezone)}</p>
              {submission.rejectionReason && (
                <p>Rejection: <span className="text-red-300">{submission.rejectionReason}</span></p>
              )}
              {submission.flagReason && (
                <p>Flag: <span className="text-orange-300">{submission.flagReason}</span></p>
              )}
              {submission.adminNotes && (
                <p>Notes: <span className="text-gray-300">{submission.adminNotes}</span></p>
              )}
            </div>
          )}
          <SubmissionReviewActions
            submissionId={submission.id}
            currentStatus={status as "pending" | "approved" | "flagged" | "rejected"}
          />
        </CardContent>
      </Card>

      {/* Submission details */}
      <Card className="bg-gray-900 border-gray-800 mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm text-gray-300">Applicant Details</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <div>
              <dt className="text-gray-500 text-xs">Full name</dt>
              <dd className="text-white mt-0.5">{submission.fullName}</dd>
            </div>
            <div>
              <dt className="text-gray-500 text-xs">NRIC</dt>
              <dd className="text-white mt-0.5 font-mono">{submission.nricNumber}</dd>
            </div>
            <div>
              <dt className="text-gray-500 text-xs">Phone</dt>
              <dd className="text-white mt-0.5">{submission.phoneNumber}</dd>
            </div>
            <div>
              <dt className="text-gray-500 text-xs">Licence no.</dt>
              <dd className="text-white mt-0.5 font-mono">{submission.licenceNumber}</dd>
            </div>
            {submission.vehiclePlate && (
              <>
                <div>
                  <dt className="text-gray-500 text-xs">Vehicle plate</dt>
                  <dd className="text-white mt-0.5 font-mono">{submission.vehiclePlate}</dd>
                </div>
                <div>
                  <dt className="text-gray-500 text-xs">Relationship</dt>
                  <dd className="text-white mt-0.5">{submission.vehicleRelationship ?? "—"}</dd>
                </div>
              </>
            )}
            {submission.vehicleMake && (
              <div className="col-span-2">
                <dt className="text-gray-500 text-xs">Vehicle</dt>
                <dd className="text-white mt-0.5">{submission.vehicleMake} {submission.vehicleModel}</dd>
              </div>
            )}
          </dl>
          <Separator className="my-4 bg-gray-800" />
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">Driver record:</span>
            <Link href={`/drivers/${driver.id}`} className="text-xs text-blue-400 hover:text-blue-300">
              View driver profile ↗
            </Link>
            <Badge variant="outline" className="text-xs border-gray-700 text-gray-400">
              {driver.complianceStatus.replace("_", " ")}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Driver compliance documents */}
      <Card className="bg-gray-900 border-gray-800 mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm text-gray-300">Driver Documents</CardTitle>
        </CardHeader>
        <CardContent>
          <ComplianceDocumentList
            documents={driver.documents}
            entityType="driver"
            entityId={driver.id}
            timezone={timezone}
          />
        </CardContent>
      </Card>

      {/* Vehicle compliance documents */}
      {driver.vehicleOwnerships.map((ownership) => (
        <Card key={ownership.id} className="bg-gray-900 border-gray-800 mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-gray-300 flex items-center gap-2">
              Vehicle Documents
              <span className="font-mono text-gray-500">
                {ownership.vehicle.plateNumber}
              </span>
              <Badge variant="outline" className="text-xs border-gray-700 text-gray-500">
                {ownership.relationshipType}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ComplianceDocumentList
              documents={ownership.vehicle.documents}
              entityType="vehicle"
              entityId={ownership.vehicle.id}
              timezone={timezone}
            />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
