import { NextResponse } from "next/server";
import { prisma, type TxClient } from "@/lib/prisma";
import { evaluateAndSyncDriverCompliance, evaluateAndSyncVehicleCompliance } from "@/lib/compliance/state-machine";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { decision, notes } = await req.json();

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
        reviewedBy: "admin",
        reviewedAt: new Date(),
        notes: notes ?? null,
      },
    });

    await tx.auditLog.create({
      data: {
        entityType: "compliance",
        entityId: id,
        action: `document_${decision}`,
        actorId: "admin",
        metadata: { docType: doc.docType, notes },
      },
    });
  });

  // Cascade compliance re-evaluation to the parent entity
  if (doc.driverId) await evaluateAndSyncDriverCompliance(doc.driverId, "admin");
  if (doc.vehicleId) await evaluateAndSyncVehicleCompliance(doc.vehicleId, "admin");

  return NextResponse.json({ ok: true });
}
