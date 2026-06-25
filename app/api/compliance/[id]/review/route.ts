import { NextResponse } from "next/server";
import { withAuth } from "@workos-inc/authkit-nextjs";
import { prisma, type TxClient } from "@/lib/prisma";
import { evaluateAndSyncDriverCompliance, evaluateAndSyncVehicleCompliance } from "@/lib/compliance/state-machine";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user } = await withAuth({ ensureSignedIn: true });
  const { id } = await params;
  const { decision, notes } = await req.json(); // notes stored in audit log only

  if (decision !== "verified" && decision !== "rejected") {
    return NextResponse.json({ error: "decision must be 'verified' or 'rejected'" }, { status: 400 });
  }

  const doc = await prisma.complianceDocument.findUnique({ where: { id } });
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.$transaction(async (tx: TxClient) => {
    await tx.complianceDocument.update({
      where: { id },
      data: {
        status: decision,
        reviewedBy: user.id,
        reviewedAt: new Date(),
      },
    });

    await tx.auditLog.create({
      data: {
        entityType: "compliance",
        entityId: id,
        action: `document_${decision}`,
        actorId: user.id,
        metadata: { docType: doc.docType, notes },
      },
    });
  });

  // Cascade compliance re-evaluation to the parent entity
  if (doc.driverId) await evaluateAndSyncDriverCompliance(doc.driverId, user.id);
  if (doc.vehicleId) await evaluateAndSyncVehicleCompliance(doc.vehicleId, user.id);

  return NextResponse.json({ ok: true });
}
