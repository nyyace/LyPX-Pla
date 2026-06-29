import { prisma } from "@/lib/prisma";
import { ComplianceQueueTable } from "@/components/compliance/ComplianceQueueTable";
import { SelfSubmittedTable } from "@/components/compliance/SelfSubmittedTable";
import { withAuth } from "@workos-inc/authkit-nextjs";
import { getUserTimezone } from "@/lib/utils/timezone";

export default async function ComplianceQueuePage() {
  const { user } = await withAuth({ ensureSignedIn: true });
  const tz = await getUserTimezone(user.id);

  const [pending, expired, selfSubmitted] = await Promise.all([
    prisma.complianceDocument.findMany({
      where: {
        status: "pending_review",
        OR: [
          { entityType: "vehicle" },
          { driver: { sourceType: { not: "self_submitted" } } },
        ],
      },
      orderBy: { uploadedAt: "asc" },
      include: {
        driver: { select: { id: true, firstName: true, lastName: true, sourceType: true } },
        vehicle: { select: { id: true, plateNumber: true, make: true, model: true } },
      },
    }),
    prisma.complianceDocument.findMany({
      where: { status: "verified", expiryDate: { lte: new Date() } },
      orderBy: { expiryDate: "asc" },
      take: 20,
      include: {
        driver: { select: { id: true, firstName: true, lastName: true, sourceType: true } },
        vehicle: { select: { id: true, plateNumber: true } },
      },
    }),
    prisma.driver.findMany({
      where: {
        sourceType: "self_submitted",
        complianceStatus: "pending",
      },
      orderBy: { createdAt: "desc" },
      include: {
        documents: {
          where: { status: "pending_review" },
          orderBy: { expiryDate: "asc" },
        },
        _count: { select: { documents: true } },
      },
    }),
  ]);

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-white">Compliance Queue</h1>
        <p className="text-sm text-gray-500 mt-1">
          {pending.length} pending review · {expired.length} expired
          {selfSubmitted.length > 0 && ` · ${selfSubmitted.length} self-submitted`}
        </p>
      </div>

      {selfSubmitted.length > 0 && (
        <section className="mb-8">
          <h2 className="text-sm font-medium text-purple-400 uppercase tracking-wide mb-3 flex items-center gap-2">
            Self-Submitted Applicants
            <span className="px-1.5 py-0.5 rounded bg-purple-900 text-purple-300 text-xs font-normal normal-case">
              {selfSubmitted.length}
            </span>
          </h2>
          <SelfSubmittedTable drivers={selfSubmitted} timezone={tz} />
        </section>
      )}

      <section className="mb-8">
        <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wide mb-3">
          Pending Review
        </h2>
        <ComplianceQueueTable docs={pending} section="pending" timezone={tz} />
      </section>

      {expired.length > 0 && (
        <section>
          <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wide mb-3">
            Recently Expired (verified docs past expiry)
          </h2>
          <ComplianceQueueTable docs={expired} section="expired" timezone={tz} />
        </section>
      )}
    </div>
  );
}
