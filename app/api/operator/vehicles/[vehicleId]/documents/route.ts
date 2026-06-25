import { withAuth } from "@workos-inc/authkit-nextjs";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getOperatorTenant } from "@/lib/utils/operator";
import { uploadToR2, makeR2Key, deleteFromR2 } from "@/lib/r2";
import { evaluateAndSyncVehicleCompliance } from "@/lib/compliance/state-machine";

const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/heic", "application/pdf"];
const MAX_SIZE = 5 * 1024 * 1024;

export async function POST(
  req: Request,
  { params }: { params: Promise<{ vehicleId: string }> }
) {
  const { user } = await withAuth({ ensureSignedIn: true });
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tenant = await getOperatorTenant(user.id);
  if (!tenant) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { vehicleId } = await params;

  const vehicle = await prisma.vehicle.findFirst({
    where: { id: vehicleId, registeredByTenantId: tenant.id },
  });
  if (!vehicle) return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });

  const form = await req.formData();
  const file = form.get("file") as File | null;
  const docType = form.get("docType") as string | null;
  const expiryDate = form.get("expiryDate") as string | null;
  const issuedDate = form.get("issuedDate") as string | null;

  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });
  if (!docType) return NextResponse.json({ error: "docType is required" }, { status: 400 });
  if (!expiryDate) return NextResponse.json({ error: "expiryDate is required" }, { status: 400 });
  if (!ALLOWED_TYPES.includes(file.type)) return NextResponse.json({ error: "Invalid file type" }, { status: 400 });
  if (file.size > MAX_SIZE) return NextResponse.json({ error: "File must be under 5 MB" }, { status: 400 });

  const buffer = Buffer.from(await file.arrayBuffer());
  const storageKey = makeR2Key(vehicleId, docType, file.name);

  await uploadToR2(storageKey, buffer, file.type);

  try {
    await prisma.$transaction(async (tx) => {
      const doc = await tx.complianceDocument.create({
        data: {
          entityType: "vehicle",
          vehicleId,
          docType,
          expiryDate: new Date(expiryDate),
          issuedDate: issuedDate ? new Date(issuedDate) : null,
          status: "pending_review",
        },
      });

      await tx.documentFile.create({
        data: {
          complianceDocumentId: doc.id,
          fileName: file.name,
          mimeType: file.type,
          size: file.size,
          storageKey,
        },
      });

      await tx.auditLog.create({
        data: {
          entityType: "vehicle",
          entityId: vehicleId,
          action: "document_uploaded",
          actorId: user.id,
          metadata: { docType, fileName: file.name, expiryDate, storageKey },
        },
      });
    });

    await evaluateAndSyncVehicleCompliance(vehicleId, user.id);
  } catch (err) {
    await deleteFromR2(storageKey).catch(() => {});
    throw err;
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}
