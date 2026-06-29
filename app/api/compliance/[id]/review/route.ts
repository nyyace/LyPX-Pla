import { NextResponse } from "next/server";
import { withAuth } from "@workos-inc/authkit-nextjs";
import { prisma } from "@/lib/prisma";
import { evaluateAndSyncDriverCompliance, evaluateAndSyncVehicleCompliance } from "@/lib/compliance/state-machine";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user } = await withAuth({ ensureSignedIn: true });
  const { id } = await params;

  const body = await req.json() as {
    // legacy shape (ReviewDocumentDialog)
    decision?: "verified" | "rejected";
    notes?: string;
    // new shape (GateQueuePanel, DocReviewPanel)
    action?: "approve" | "reject";
    reason?: string;
  };

  // Normalise to a single status value
  let status: "verified" | "rejected" | undefined;
  if (body.decision === "verified" || body.action === "approve") status = "verified";
  if (body.decision === "rejected" || body.action === "reject")  status = "rejected";

  if (!status) {
    return NextResponse.json({ error: "Provide action ('approve'|'reject') or decision ('verified'|'rejected')" }, { status: 400 });
  }

  const rejectionReason = (body.reason ?? body.notes ?? "").trim() || null;

  if (status === "rejected" && !rejectionReason) {
    return NextResponse.json({ error: "Rejection reason is required" }, { status: 400 });
  }

  const doc = await prisma.complianceDocument.findUnique({ where: { id } });
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.$transaction([
    prisma.complianceDocument.update({
      where: { id },
      data: {
        status,
        reviewedBy: user.id,
        reviewedAt: new Date(),
      },
    }),
    prisma.auditLog.create({
      data: {
        entityType: "compliance",
        entityId:   id,
        action:     status === "verified" ? "document_approved" : "document_rejected",
        actorId:    user.id,
        metadata:   { docType: doc.docType, reason: rejectionReason },
      },
    }),
  ]);

  if (doc.driverId)  await evaluateAndSyncDriverCompliance(doc.driverId, user.id);
  if (doc.vehicleId) await evaluateAndSyncVehicleCompliance(doc.vehicleId, user.id);

  return NextResponse.json({ ok: true });
}
