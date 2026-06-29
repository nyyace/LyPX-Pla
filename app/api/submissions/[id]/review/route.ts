import { withAuth } from "@workos-inc/authkit-nextjs";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { evaluateAndSyncDriverCompliance } from "@/lib/compliance/state-machine";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user } = await withAuth({ ensureSignedIn: true });
  const { id } = await params;

  const submission = await prisma.driverSubmission.findUnique({
    where: { id },
    include: { driver: true },
  });
  if (!submission) {
    return NextResponse.json({ error: "Submission not found" }, { status: 404 });
  }

  const body = await req.json();
  const { action, reason, notes } = body as {
    action: "approve" | "reject" | "flag";
    reason?: string;
    notes?: string;
  };

  if (!["approve", "reject", "flag"].includes(action)) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }
  if (action === "reject" && !reason?.trim()) {
    return NextResponse.json({ error: "Rejection reason is required" }, { status: 400 });
  }
  if (action === "flag" && !reason?.trim()) {
    return NextResponse.json({ error: "Flag reason is required" }, { status: 400 });
  }

  const now       = new Date();
  const driverId  = submission.driverId;
  const reviewerId = user.id;

  await prisma.$transaction(async (tx) => {
    if (action === "approve") {
      await tx.driverSubmission.update({
        where: { id },
        data: {
          reviewedBy: reviewerId,
          reviewedAt: now,
          adminNotes: notes?.trim() || null,
          flagReason: null,
          rejectionReason: null,
        },
      });

      // Mark all pending driver documents as verified with reviewer name
      await tx.complianceDocument.updateMany({
        where: { driverId, status: "pending_review" },
        data: { status: "verified", reviewedBy: reviewerId, reviewedAt: now },
      });

      await tx.auditLog.create({
        data: {
          entityType: "driver",
          entityId:   driverId,
          action:     "submission_approved",
          actorId:    reviewerId,
          metadata:   { submissionId: id, notes: notes ?? null },
        },
      });
    } else if (action === "reject") {
      await tx.driverSubmission.update({
        where: { id },
        data: {
          reviewedBy:      reviewerId,
          reviewedAt:      now,
          rejectionReason: reason!.trim(),
          adminNotes:      notes?.trim() || null,
          flagReason:      null,
        },
      });

      // Mark all pending driver documents as rejected with reviewer name
      await tx.complianceDocument.updateMany({
        where: { driverId, status: "pending_review" },
        data: { status: "rejected", reviewedBy: reviewerId, reviewedAt: now },
      });

      await tx.auditLog.create({
        data: {
          entityType: "driver",
          entityId:   driverId,
          action:     "submission_rejected",
          actorId:    reviewerId,
          metadata:   { submissionId: id, reason, notes: notes ?? null },
        },
      });
    } else {
      // flag — leaves documents in current state, just marks submission
      await tx.driverSubmission.update({
        where: { id },
        data: {
          reviewedBy: reviewerId,
          reviewedAt: now,
          flagReason: reason!.trim(),
          adminNotes: notes?.trim() || null,
          rejectionReason: null,
        },
      });

      await tx.auditLog.create({
        data: {
          entityType: "driver",
          entityId:   driverId,
          action:     "submission_flagged",
          actorId:    reviewerId,
          metadata:   { submissionId: id, reason, notes: notes ?? null },
        },
      });
    }
  });

  // Let the compliance engine derive the correct driver status from actual document states
  if (action !== "flag") {
    await evaluateAndSyncDriverCompliance(driverId, reviewerId);
  }

  return NextResponse.json({ ok: true });
}
