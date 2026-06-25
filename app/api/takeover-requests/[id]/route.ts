import { NextResponse } from "next/server";
import { withAuth } from "@workos-inc/authkit-nextjs";
import { prisma, type TxClient } from "@/lib/prisma";

// Scorecard criteria and weights (5 criteria, max 100 points)
export const SCORECARD_CRITERIA = [
  { key: "trip_volume", label: "Trip Volume", maxScore: 25 },
  { key: "revenue_contribution", label: "Revenue Contribution", maxScore: 25 },
  { key: "relationship_tenure", label: "Relationship Tenure", maxScore: 20 },
  { key: "compliance_record", label: "Compliance Record", maxScore: 20 },
  { key: "strategic_value", label: "Strategic Value", maxScore: 10 },
] as const;

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const request = await prisma.takeoverRequest.findUnique({
    where: { id },
    include: { account: true },
  });

  if (!request) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ...request, scorecardCriteria: SCORECARD_CRITERIA });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user } = await withAuth({ ensureSignedIn: true });
  const { id } = await params;
  const body = await req.json();

  const request = await prisma.takeoverRequest.findUnique({ where: { id } });
  if (!request) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updates: Record<string, unknown> = {};

  // Score submission
  if (body.scoreBreakdown) {
    const breakdown = body.scoreBreakdown as Record<string, number>;
    const total = Object.values(breakdown).reduce((sum, v) => sum + v, 0);
    updates.scoreBreakdown = breakdown;
    updates.score = total;
  }

  // Decision
  if (body.status) {
    if (!["pending", "conditional", "approved", "denied"].includes(body.status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }
    updates.status = body.status;
    if (["approved", "denied", "conditional"].includes(body.status)) {
      updates.reviewedAt = new Date();
    }
  }

  if (body.decisionNotes !== undefined) updates.decisionNotes = body.decisionNotes;
  if (body.rightToRespondInvoked !== undefined) {
    updates.rightToRespondInvoked = body.rightToRespondInvoked;
    if (body.rightToRespondInvoked) {
      const deadline = new Date();
      deadline.setDate(deadline.getDate() + 7);
      updates.rightToRespondDeadline = deadline;
    }
  }

  const updated = await prisma.$transaction(async (tx: TxClient) => {
    const r = await tx.takeoverRequest.update({ where: { id }, data: updates });
    await tx.auditLog.create({
      data: {
        entityType: "takeover_request",
        entityId: id,
        action: body.status ? `takeover_${body.status}` : "takeover_updated",
        actorId: user.id,
        metadata: updates as object,
      },
    });
    return r;
  });

  return NextResponse.json(updated);
}
