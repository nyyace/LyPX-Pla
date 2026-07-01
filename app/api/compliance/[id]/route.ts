import { NextResponse } from "next/server";
import { withAuth } from "@workos-inc/authkit-nextjs";
import { prisma } from "@/lib/prisma";
import { evaluateAndSyncDriverCompliance, evaluateAndSyncVehicleCompliance } from "@/lib/compliance/state-machine";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user } = await withAuth({ ensureSignedIn: true });
  const { id } = await params;

  const body = await req.json() as {
    expiryDate?: string | null;
    issuedDate?: string | null;
    referenceNumber?: string | null;
  };

  const updates: Record<string, unknown> = {};
  if (body.expiryDate !== undefined) updates.expiryDate = body.expiryDate ? new Date(body.expiryDate) : null;
  if (body.issuedDate !== undefined) updates.issuedDate = body.issuedDate ? new Date(body.issuedDate) : null;
  if (body.referenceNumber !== undefined) updates.referenceNumber = body.referenceNumber ?? null;

  if (!Object.keys(updates).length) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  const doc = await prisma.complianceDocument.findUnique({ where: { id } });
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updated = await prisma.complianceDocument.update({ where: { id }, data: updates });

  await prisma.auditLog.create({
    data: {
      entityType: "compliance",
      entityId: id,
      action: "document_updated",
      actorId: user.id,
      metadata: { changes: updates as object } as object,
    },
  });

  if (doc.driverId) await evaluateAndSyncDriverCompliance(doc.driverId, user.id);
  if (doc.vehicleId) await evaluateAndSyncVehicleCompliance(doc.vehicleId, user.id);

  return NextResponse.json(updated);
}
