import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { format } from "date-fns";
import { ReviewDocumentDialog } from "@/components/compliance/ReviewDocumentDialog";
import { ComplianceQueueTable } from "@/components/compliance/ComplianceQueueTable";

export default async function ComplianceQueuePage() {
  const pending = await prisma.complianceDocument.findMany({
    where: { status: "pending_review" },
    orderBy: { uploadedAt: "asc" },
    include: {
      driver: { select: { id: true, firstName: true, lastName: true } },
      vehicle: { select: { id: true, plateNumber: true, make: true, model: true } },
    },
  });

  const expired = await prisma.complianceDocument.findMany({
    where: { status: "verified", expiryDate: { lte: new Date() } },
    orderBy: { expiryDate: "asc" },
    take: 20,
    include: {
      driver: { select: { id: true, firstName: true, lastName: true } },
      vehicle: { select: { id: true, plateNumber: true } },
    },
  });

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-white">Compliance Queue</h1>
        <p className="text-sm text-gray-500 mt-1">
          {pending.length} pending review · {expired.length} expired
        </p>
      </div>

      <section className="mb-8">
        <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wide mb-3">
          Pending Review
        </h2>
        <ComplianceQueueTable docs={pending} section="pending" />
      </section>

      {expired.length > 0 && (
        <section>
          <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wide mb-3">
            Recently Expired (verified docs past expiry)
          </h2>
          <ComplianceQueueTable docs={expired} section="expired" />
        </section>
      )}
    </div>
  );
}
