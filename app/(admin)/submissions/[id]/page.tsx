import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { withAuth } from "@workos-inc/authkit-nextjs";
import { getUserTimezone } from "@/lib/utils/timezone";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { SubmissionReviewActions } from "@/components/submissions/SubmissionReviewActions";
import { DocReviewPanel, type DocEntry } from "@/components/submissions/DocReviewPanel";
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

  const driverDocByType = Object.fromEntries(
    driver.documents.map((d) => [d.docType, d])
  );

  const vocExpiry = submission.vocationalLicenceExpiryDate;
  const vocExpiryExpiringSoon = isWithinDays(vocExpiry, 30);

  // Build doc entries for the DocReviewPanel ─────────────────────────────────
  function makeEntry(
    doc: typeof driver.documents[number] | undefined,
    label: string,
    crossCheckNote?: string,
  ): DocEntry {
    return {
      id:    doc?.id ?? "",
      label,
      status: doc?.status ?? "pending_review",
      hasFile: !!doc?.file,
      isPdf: doc?.file?.mimeType === "application/pdf",
      crossCheckNote,
    };
  }

  const driverDocs: DocEntry[] = [
    makeEntry(driverDocByType["nric"],                     "NRIC / Passport"),
    makeEntry(driverDocByType["driving_licence"],          "Driving Licence"),
    makeEntry(driverDocByType["vocational_licence"],       "Vocational Licence"),
    makeEntry(
      driverDocByType["vocational_licence_expiry"],
      "Vocational Licence — Expiry Page",
      `Driver entered expiry: ${formatTZDate(vocExpiry, timezone)}${vocExpiryExpiringSoon ? " ⚠ Expiring soon" : ""} — confirm the document shows this date.`,
    ),
  ].filter((e) => e.id);

  const vehicleSections: { plate: string; docs: DocEntry[] }[] = [];
  for (const ownership of driver.vehicleOwnerships) {
    const v = ownership.vehicle;
    const vDocByType = Object.fromEntries(v.documents.map((d) => [d.docType, d]));
    const vDocs: DocEntry[] = [
      makeEntry(vDocByType["vehicle_log_card"], `${v.plateNumber} — Log Card`),
      ...(submission.vehicleRelationship === "rented"
        ? [makeEntry(vDocByType["rental_agreement"], `${v.plateNumber} — Rental Agreement`)]
        : []),
    ].filter((e) => e.id);
    if (vDocs.length) vehicleSections.push({ plate: v.plateNumber, docs: vDocs });
  }

  return (
    <div className="p-8 max-w-5xl">
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

      {/* Batch review decision */}
      <Card className="bg-gray-900 border-gray-800 mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm text-gray-300">Batch Review Decision</CardTitle>
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
          <p className="text-xs text-gray-600 mb-3">
            Approve or reject all pending documents at once — or use the per-document controls below.
          </p>
          <SubmissionReviewActions
            submissionId={submission.id}
            currentStatus={status as "pending" | "approved" | "flagged" | "rejected"}
          />
        </CardContent>
      </Card>

      {/* Two-column: details left, documents right */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Left — submitted details */}
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-gray-300">Submitted Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-3">Personal</p>
              <dl className="space-y-3">
                <Field label="First name"    value={submission.firstName} />
                <Field label="Last name"     value={submission.lastName} />
                <Field label="NRIC Number"   value={submission.nricNumber} />
                <Field label="Phone Number"  value={submission.phoneNumber} />
              </dl>
            </div>
            <Separator className="bg-gray-800" />
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-3">Driving Credentials</p>
              <dl className="space-y-3">
                <Field label="Driving Licence No."   value={submission.drivingLicenceNumber} />
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
                    <Field label="Plate No."      value={submission.vehiclePlate} />
                    {submission.vehicleMake && (
                      <Field label="Make / Model" value={`${submission.vehicleMake} ${submission.vehicleModel ?? ""}`.trim()} />
                    )}
                    <Field label="Relationship"   value={submission.vehicleRelationship ?? undefined} />
                  </dl>
                </div>
              </>
            )}
            <Separator className="bg-gray-800" />
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">Driver record:</span>
              <Link href={`/drivers/${driver.id}`} className="text-xs text-blue-400 hover:text-blue-300">
                View profile ↗
              </Link>
              <Badge variant="outline" className="text-xs border-gray-700 text-gray-400">
                {driver.complianceStatus.replace("_", " ")}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Right — per-document inline review */}
        <div className="space-y-4">
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-3">Driver Documents</p>
            <DocReviewPanel docs={driverDocs} />
          </div>

          {vehicleSections.map((section) => (
            <div key={section.plate}>
              <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-3">
                Vehicle — {section.plate}
              </p>
              <DocReviewPanel docs={section.docs} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
