import { NextResponse } from "next/server";
import { withAuth } from "@workos-inc/authkit-nextjs";
import { prisma, type TxClient } from "@/lib/prisma";
import { isAdminUser } from "@/lib/utils/admin";
import {
  evaluateAndSyncDriverCompliance,
  evaluateAndSyncVehicleCompliance,
} from "@/lib/compliance/state-machine";

export async function POST(req: Request) {
  const { user } = await withAuth({ ensureSignedIn: true });
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = await isAdminUser(user.id);
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const { entityType, entityId, docType, expiryDate, issuedDate, note } = body as {
    entityType: string;
    entityId: string;
    docType: string;
    expiryDate: string;
    issuedDate?: string;
    note?: string;
  };

  if (!entityType || !entityId || !docType || !expiryDate) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }
  if (!["driver", "vehicle"].includes(entityType)) {
    return NextResponse.json({ error: "Invalid entityType" }, { status: 400 });
  }

  const createData: Parameters<typeof prisma.complianceDocument.create>[0]["data"] = {
    entityType,
    docType,
    expiryDate: new Date(expiryDate),
    issuedDate: issuedDate ? new Date(issuedDate) : null,
    status: "verified",
    verificationMethod: "manual_no_file",
    reviewedBy: user.id,
    reviewedAt: new Date(),
  };
  if (entityType === "driver") createData.driverId = entityId;
  else createData.vehicleId = entityId;

  const doc = await prisma.$transaction(async (tx: TxClient) => {
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
