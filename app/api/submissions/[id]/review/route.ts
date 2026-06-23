import { withAuth } from "@workos-inc/authkit-nextjs";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

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

  const now = new Date();
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
      await tx.driver.update({
        where: { id: submission.driverId },
        data: { complianceStatus: "active" },
      });
      await tx.auditLog.create({
        data: {
          entityType: "driver",
          entityId: submission.driverId,
          action: "submission_approved",
          actorId: reviewerId,
          metadata: { submissionId: id, notes: notes ?? null },
        },
      });
    } else if (action === "reject") {
      await tx.driverSubmission.update({
        where: { id },
        data: {
          reviewedBy: reviewerId,
          reviewedAt: now,
          rejectionReason: reason!.trim(),
          adminNotes: notes?.trim() || null,
          flagReason: null,
        },
      });
      await tx.driver.update({
        where: { id: submission.driverId },
        data: { complianceStatus: "suspended" },
      });
      await tx.auditLog.create({
        data: {
          entityType: "driver",
          entityId: submission.driverId,
          action: "submission_rejected",
          actorId: reviewerId,
          metadata: { submissionId: id, reason: reason, notes: notes ?? null },
        },
      });
    } else {
      // flag
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
          entityId: submission.driverId,
          action: "submission_flagged",
          actorId: reviewerId,
          metadata: { submissionId: id, reason: reason, notes: notes ?? null },
        },
      });
    }
  });

  return NextResponse.json({ ok: true });
}
