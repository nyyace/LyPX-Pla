import { NextResponse } from "next/server";
import { prisma, type TxClient } from "@/lib/prisma";
import { evaluateAndSyncDriverCompliance, evaluateAndSyncVehicleCompliance } from "@/lib/compliance/state-machine";

export async function GET() {
  const docs = await prisma.complianceDocument.findMany({
    where: { status: "pending_review" },
    orderBy: { uploadedAt: "asc" },
    include: {
      driver: { select: { firstName: true, lastName: true } },
      vehicle: { select: { plateNumber: true, make: true, model: true } },
    },
  });

  return NextResponse.json(docs);
}

export async function POST(req: Request) {
  const body = await req.json();
  const { entityType, entityId, docType, expiryDate } = body;

  if (!entityType || !entityId || !docType || !expiryDate) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const data: Parameters<typeof prisma.complianceDocument.create>[0]["data"] = {
    entityType,
    docType,
    expiryDate: new Date(expiryDate),
    status: "pending_review",
  };

  if (entityType === "driver") data.driverId = entityId;
  else if (entityType === "vehicle") data.vehicleId = entityId;
  else return NextResponse.json({ error: "Invalid entityType" }, { status: 400 });

  const doc = await prisma.$transaction(async (tx: TxClient) => {
    const d = await tx.complianceDocument.create({ data });
    await tx.auditLog.create({
      data: {
        entityType: "compliance",
        entityId: d.id,
        action: "document_uploaded",
        actorId: "admin",
        metadata: { entityType, entityId, docType, expiryDate },
      },
    });
    return d;
  });

  return NextResponse.json(doc, { status: 201 });
}
