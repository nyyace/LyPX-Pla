import { NextResponse } from "next/server";
import { withAuth } from "@workos-inc/authkit-nextjs";
import { prisma, type TxClient } from "@/lib/prisma";
import { isAdminUser } from "@/lib/utils/admin";
import {
  evaluateAndSyncDriverCompliance,
  evaluateAndSyncVehicleCompliance,
} from "@/lib/compliance/state-machine";

const DRIVER_DOC_TYPES = ["nric", "driving_licence", "vocational_licence"];
const VEHICLE_DOC_TYPES = ["insurance", "rental_agreement"];

export async function POST(req: Request) {
  const { user } = await withAuth({ ensureSignedIn: true });
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = await isAdminUser(user.id);
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const { entityType, entityId, docType, expiryDate, issuedDate, referenceNumber, note } = body as {
    entityType: string;
    entityId: string;
    docType: string;
    expiryDate?: string;
    issuedDate?: string;
    referenceNumber?: string;
    note?: string;
  };

  const EXPIRY_REQUIRED = ["vocational_licence", "insurance", "rental_agreement"];

  if (!entityType || !entityId || !docType) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }
  if (EXPIRY_REQUIRED.includes(docType) && !expiryDate) {
    return NextResponse.json({ error: `expiryDate is required for ${docType}` }, { status: 400 });
  }
  if (!["driver", "vehicle"].includes(entityType)) {
    return NextResponse.json({ error: "Invalid entityType" }, { status: 400 });
  }
  if (entityType === "driver" && !DRIVER_DOC_TYPES.includes(docType)) {
    return NextResponse.json({ error: `Invalid docType for driver. Allowed: ${DRIVER_DOC_TYPES.join(", ")}` }, { status: 400 });
  }
  if (entityType === "vehicle" && !VEHICLE_DOC_TYPES.includes(docType)) {
    return NextResponse.json({ error: `Invalid docType for vehicle. Allowed: ${VEHICLE_DOC_TYPES.join(", ")}` }, { status: 400 });
  }

  const createData: Parameters<typeof prisma.complianceDocument.create>[0]["data"] = {
    entityType,
    docType,
    expiryDate:      expiryDate      ? new Date(expiryDate)  : null,
    issuedDate:      issuedDate      ? new Date(issuedDate)  : null,
    referenceNumber: referenceNumber ?? null,
    status: "verified",
    verificationMethod: "manual_no_file",
    reviewedBy: user.id,
    reviewedAt: new Date(),
  };
  if (entityType === "driver") createData.driverId = entityId;
  else createData.vehicleId = entityId;

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

    const d = await tx.complianceDocument.create({ data: createData });
    await tx.auditLog.create({
      data: {
        entityType: "compliance",
        entityId: d.id,
        action: "document.manual_entry_no_file",
        actorId: user.id,
        metadata: { entityType, entityId, docType, expiryDate, note: note ?? null },
      },
    });
    return d;
  });

  if (entityType === "driver") {
    await evaluateAndSyncDriverCompliance(entityId, user.id);
  } else {
    await evaluateAndSyncVehicleCompliance(entityId, user.id);
  }

  return NextResponse.json(doc, { status: 201 });
}
