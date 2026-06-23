import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { withAuth } from "@workos-inc/authkit-nextjs";
import { getUserTimezone } from "@/lib/utils/timezone";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { SubmissionReviewActions } from "@/components/submissions/SubmissionReviewActions";
import { formatTZDate, DEFAULT_TIMEZONE, isWithinDays } from "@/lib/utils/date";

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

function DocLink({ doc, label }: {
  doc: { id: string; file: { mimeType: string } | null } | null | undefined;
  label: string;
}) {
  if (!doc?.file) {
    return (
      <div>
        <p className="text-xs text-gray-500 mb-0.5">{label}</p>
        <span className="text-xs text-gray-600 italic">Document not available</span>
      </div>
    );
  }
  const ispdf = doc.file.mimeType === "application/pdf";
  return (
    <div>
      <p className="text-xs text-gray-500 mb-0.5">{label}</p>
      <a
        href={`/api/compliance/${doc.id}/file`}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300"
      >
        📄 View {ispdf ? "PDF" : "document"} ↗
      </a>
    </div>
  );
}

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <dt className="text-xs text-gray-500">{label}</dt>
      <dd className="text-sm text-white mt-0.5 font-mono">{value ?? "—"}</dd>
    </div>
  );
}

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

  // Map driver docs by type (take first match per type)
  const driverDocByType = Object.fromEntries(
    driver.documents.map((d) => [d.docType, d])
  );

  // Vocational licence expiry — check if expiring soon
  const vocExpiry = submission.vocationalLicenceExpiryDate;
  const vocExpiryExpiringSoon = isWithinDays(vocExpiry, 30);

  return (
    <div className="p-8 max-w-4xl">
      <div className="mb-6">
        <Link href="/submissions" className="text-xs text-gray-500 hover:text-gray-300 mb-3 block">
          ← Submissions
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-white">
              {submission.firstName} {submission.lastName}
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Submitted {formatTZDate(submission.submittedAt, timezone)}
            </p>
          </div>
          <Badge variant="outline" className={`text-sm ${statusStyles[status]}`}>
            {status}
          </Badge>
        </div>
      </div>

      {/* Review Decision */}
      <Card className="bg-gray-900 border-gray-800 mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm text-gray-300">Review Decision</CardTitle>
        </CardHeader>
        <CardContent>
          {status !== "pending" && (
            <div className="mb-4 space-y-1 text-xs text-gray-500">
              <p>
                Reviewed by <span className="text-gray-300">{submission.reviewedBy}</span>
                {" "}on {formatTZDate(submission.reviewedAt!, timezone)}
              </p>
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

      {/* Two-column: details + documents */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">

        {/* Left column — Submitted details */}
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-gray-300">Submitted Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-3">Personal Information</p>
              <dl className="space-y-3">
                <Field label="First name" value={submission.firstName} />
                <Field label="Last name" value={submission.lastName} />
                <Field label="NRIC Number" value={submission.nricNumber} />
                <Field label="Phone Number" value={submission.phoneNumber} />
              </dl>
            </div>
            <Separator className="bg-gray-800" />
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-3">Driving Credentials</p>
              <dl className="space-y-3">
                <Field label="Driving Licence No." value={submission.drivingLicenceNumber} />
                <div>
                  <dt className="text-xs text-gray-500">Driving Licence Issued</dt>
                  <dd className="text-sm text-white mt-0.5">
                    {formatTZDate(submission.drivingLicenceIssuedDate, timezone)}
                  </dd>
                </div>
                <Field label="Vocational Licence No." value={submission.vocationalLicenceNumber} />
                <div>
                  <dt className="text-xs text-gray-500">Vocational Licence Expiry</dt>
                  <dd className={`text-sm mt-0.5 font-mono ${vocExpiryExpiringSoon ? "text-red-400 font-semibold" : "text-white"}`}>
                    {formatTZDate(vocExpiry, timezone)}
                    {vocExpiryExpiringSoon && (
                      <span className="ml-2 text-xs font-normal text-red-400">⚠ Expiring soon</span>
                    )}
                  </dd>
                </div>
              </dl>
            </div>
            {submission.vehiclePlate && (
              <>
                <Separator className="bg-gray-800" />
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-3">Vehicle</p>
                  <dl className="space-y-3">
                    <Field label="Plate No." value={submission.vehiclePlate} />
                    {submission.vehicleMake && (
                      <Field label="Make / Model" value={`${submission.vehicleMake} ${submission.vehicleModel ?? ""}`.trim()} />
                    )}
                    <Field label="Relationship" value={submission.vehicleRelationship ?? undefined} />
                  </dl>
                </div>
              </>
            )}
            <Separator className="bg-gray-800" />
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

        {/* Right column — Documents */}
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-gray-300">Documents</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <DocLink doc={driverDocByType["nric"]} label="NRIC / Passport" />
            <DocLink doc={driverDocByType["driving_licence"]} label="Driving Licence" />
            <DocLink doc={driverDocByType["vocational_licence"]} label="Vocational Licence" />

            {/* Expiry page — with cross-check note */}
            <div className="space-y-1.5">
              <DocLink doc={driverDocByType["vocational_licence_expiry"]} label="Vocational Licence (Expiry Page)" />
              <div className="mt-1.5 px-3 py-2 rounded-md bg-gray-800 border border-gray-700 text-xs space-y-0.5">
                <p className="text-gray-400">
                  Expiry entered by driver:{" "}
                  <span className={`font-mono font-medium ${vocExpiryExpiringSoon ? "text-red-400" : "text-white"}`}>
                    {formatTZDate(vocExpiry, timezone)}
                  </span>
                </p>
                <p className="text-gray-600">⚠ Cross-check: confirm the document above shows this expiry date.</p>
              </div>
            </div>

            {/* Vehicle documents (if vehicle submitted) */}
            {submission.vehiclePlate && driver.vehicleOwnerships.length > 0 && (
              <>
                <Separator className="bg-gray-800" />
                <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">
                  Vehicle — {submission.vehiclePlate}
                </p>
                {driver.vehicleOwnerships.map((o) => {
                  const vehicleDocByType = Object.fromEntries(
                    o.vehicle.documents.map((d) => [d.docType, d])
                  );
                  return (
                    <div key={o.id} className="space-y-4">
                      <DocLink doc={vehicleDocByType["vehicle_log_card"]} label="Vehicle Log Card" />
                      {submission.vehicleRelationship === "rented" && (
                        <DocLink doc={vehicleDocByType["rental_agreement"]} label="Rental Agreement" />
                      )}
                    </div>
                  );
                })}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
