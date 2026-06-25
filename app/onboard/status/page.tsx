import { prisma } from "@/lib/prisma";

const STAGE_INFO: Record<string, { label: string; color: string; icon: string; desc: string }> = {
  pending_review: {
    label: "Under Review",
    color: "#f59e0b",
    icon: "⏳",
    desc: "Your submission is being reviewed by the LyPX compliance team. This typically takes 1–2 business days.",
  },
  pending: {
    label: "Under Review",
    color: "#f59e0b",
    icon: "⏳",
    desc: "Your submission is being reviewed by the LyPX compliance team. This typically takes 1–2 business days.",
  },
  active: {
    label: "Approved — Active",
    color: "#22c55e",
    icon: "✓",
    desc: "Your driver profile is active. You can now be assigned to trips.",
  },
  expiring_soon: {
    label: "Documents Expiring Soon",
    color: "#f59e0b",
    icon: "⚠",
    desc: "One or more of your documents are expiring within 30 days. Please renew and upload updated documents.",
  },
  suspended: {
    label: "Suspended",
    color: "#ef4444",
    icon: "✕",
    desc: "Your profile has been suspended due to expired or rejected documents. Please contact support.",
  },
};

const DOC_LABELS: Record<string, string> = {
  nric: "NRIC / Passport",
  driving_licence: "Driving Licence",
  vocational_licence: "Vocational Licence",
  vocational_licence_expiry: "Vocational Licence (Expiry Page)",
  vehicle_log_card: "Vehicle Log Card",
  rental_agreement: "Rental Agreement",
};

export default async function OnboardStatusPage({
  searchParams,
}: {
  searchParams: Promise<{ driverId?: string; stage?: string; name?: string }>;
}) {
  const params = await searchParams;

  let driverName = params.name ?? "";
  let stage = params.stage ?? "pending_review";
  let submittedAt: Date | null = null;
  let docs: Array<{ docType: string; uploadedAt: Date; status: string }> = [];

  if (params.driverId) {
    const driver = await prisma.driver.findUnique({
      where: { id: params.driverId },
      select: { firstName: true, lastName: true, complianceStatus: true },
    });
    if (driver) {
      driverName = driver.firstName;
      stage = driver.complianceStatus;
      const submission = await prisma.driverSubmission.findUnique({
        where: { driverId: params.driverId },
        select: { submittedAt: true },
      });
      submittedAt = submission?.submittedAt ?? null;
      docs = await prisma.complianceDocument.findMany({
        where: { driverId: params.driverId, entityType: "driver" },
        select: { docType: true, uploadedAt: true, status: true },
        orderBy: { uploadedAt: "asc" },
      });
    }
  }

  const info = STAGE_INFO[stage] ?? STAGE_INFO.pending_review;

  const formattedDate = submittedAt
    ? submittedAt.toLocaleDateString("en-SG", { day: "numeric", month: "short", year: "numeric" })
    : null;

  return (
    <div className="w-full max-w-md">
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center">
        <div style={{
          width: 64, height: 64, borderRadius: "50%",
          background: `${info.color}22`, border: `2px solid ${info.color}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 28, margin: "0 auto 20px",
          color: info.color,
        }}>
          {info.icon}
        </div>

        <h1 className="text-xl font-semibold text-white mb-2">
          {driverName ? `Hi ${driverName},` : "Application Status"}
        </h1>
        <div style={{
          display: "inline-block", fontSize: 13, fontWeight: 700,
          color: info.color, border: `1px solid ${info.color}44`,
          background: `${info.color}11`, padding: "4px 12px", borderRadius: 6, marginBottom: 16,
        }}>
          {info.label}
        </div>
        {formattedDate && (
          <p className="text-xs text-gray-600 mb-2">Submitted {formattedDate}</p>
        )}
        <p className="text-gray-400 text-sm leading-relaxed mb-6">
          {info.desc}
        </p>

        {docs.length > 0 && (
          <div className="bg-gray-800 rounded-lg p-4 text-left mb-6">
            <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide mb-3">
              Documents submitted
            </p>
            <ul className="space-y-2">
              {docs.map((doc) => (
                <li key={doc.docType} className="flex items-center gap-2 text-sm">
                  <span className="text-green-400 flex-shrink-0">✓</span>
                  <span className="text-gray-300 flex-1">
                    {DOC_LABELS[doc.docType] ?? doc.docType}
                  </span>
                  {doc.status === "rejected" && (
                    <span className="text-xs text-red-400 font-medium">Rejected</span>
                  )}
                  {doc.status === "pending_review" && (
                    <span className="text-xs text-yellow-600">Pending</span>
                  )}
                  {doc.status === "verified" && (
                    <span className="text-xs text-green-600">Verified</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="bg-gray-800 rounded-lg p-4 text-left mb-6">
          <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide mb-3">What happens next</p>
          {(stage === "pending_review" || stage === "pending") && (
            <ul className="space-y-2 text-sm text-gray-300">
              <li className="flex gap-2"><span className="text-yellow-400 mt-0.5">•</span> Our team will verify your documents</li>
              <li className="flex gap-2"><span className="text-yellow-400 mt-0.5">•</span> You&apos;ll receive a message once reviewed</li>
              <li className="flex gap-2"><span className="text-yellow-400 mt-0.5">•</span> No action needed from you right now</li>
            </ul>
          )}
          {stage === "active" && (
            <ul className="space-y-2 text-sm text-gray-300">
              <li className="flex gap-2"><span className="text-green-400 mt-0.5">✓</span> Your operator will assign you to trips</li>
              <li className="flex gap-2"><span className="text-green-400 mt-0.5">✓</span> Keep your documents up to date</li>
              <li className="flex gap-2"><span className="text-green-400 mt-0.5">✓</span> Contact your operator for scheduling</li>
            </ul>
          )}
          {(stage === "expiring_soon" || stage === "suspended") && (
            <ul className="space-y-2 text-sm text-gray-300">
              <li className="flex gap-2"><span className="text-red-400 mt-0.5">!</span> Upload updated documents as soon as possible</li>
              <li className="flex gap-2"><span className="text-red-400 mt-0.5">!</span> Contact your operator for instructions</li>
            </ul>
          )}
        </div>

        <p className="text-xs text-gray-600">
          Questions? Contact LyPX support at{" "}
          <span className="text-gray-400">support@lypx.com</span>
        </p>
      </div>
    </div>
  );
}
