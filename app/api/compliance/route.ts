import { NextResponse } from "next/server";
import { withAuth } from "@workos-inc/authkit-nextjs";
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

const DRIVER_DOC_TYPES = ["nric", "driving_licence", "vocational_licence"];
const VEHICLE_DOC_TYPES = ["insurance", "rental_agreement"];

// Doc types that require expiryDate
const EXPIRY_REQUIRED = ["vocational_licence", "insurance", "rental_agreement"];

export async function POST(req: Request) {
  const { user } = await withAuth({ ensureSignedIn: true });
  const body = await req.json();
  const { entityType, entityId, docType, expiryDate, issuedDate, referenceNumber } = body;

  if (!entityType || !entityId || !docType) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }
  if (EXPIRY_REQUIRED.includes(docType) && !expiryDate) {
    return NextResponse.json({ error: `expiryDate is required for ${docType}` }, { status: 400 });
  }
  if (entityType === "driver" && !DRIVER_DOC_TYPES.includes(docType)) {
    return NextResponse.json({ error: `Invalid docType for driver. Allowed: ${DRIVER_DOC_TYPES.join(", ")}` }, { status: 400 });
  }
  if (entityType === "vehicle" && !VEHICLE_DOC_TYPES.includes(docType)) {
    return NextResponse.json({ error: `Invalid docType for vehicle. Allowed: ${VEHICLE_DOC_TYPES.join(", ")}` }, { status: 400 });
  }

  const data: Parameters<typeof prisma.complianceDocument.create>[0]["data"] = {
    entityType,
    docType,
    expiryDate:      expiryDate      ? new Date(expiryDate)      : null,
    issuedDate:      issuedDate      ? new Date(issuedDate)       : null,
    referenceNumber: referenceNumber ?? null,
    status: "pending_review",
  };

  if (entityType === "driver") data.driverId = entityId;
  else if (entityType === "vehicle") data.vehicleId = entityId;
  else return NextResponse.json({ error: "Invalid entityType" }, { status: 400 });

  const doc = await prisma.$transaction(async (tx: TxClient) => {
    // Supersede any existing active docs of the same type
    await tx.complianceDocument.updateMany({
      where: {
        ...(entityType === "driver" ? { driverId: entityId } : { vehicleId: entityId }),
        docType,
        status: { in: ["pending_review", "verified"] },
      },
      data: { status: "superseded" },
    });

    const d = await tx.complianceDocument.create({ data });
    await tx.auditLog.create({
      data: {
        entityType: "compliance",
        entityId: d.id,
        action: "document_uploaded",
        actorId: user.id,
        metadata: { entityType, entityId, docType, expiryDate },
      },
    });
    return d;
  });

  return NextResponse.json(doc, { status: 201 });
}
