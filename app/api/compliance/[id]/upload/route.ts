import { withAuth } from "@workos-inc/authkit-nextjs";
import { prisma } from "@/lib/prisma";
import { uploadToR2, makeR2Key, deleteFromR2 } from "@/lib/r2";

const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/heic", "application/pdf"];
const MAX_SIZE = 5 * 1024 * 1024;

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  await withAuth({ ensureSignedIn: true });
  const { id } = await params;

  const doc = await prisma.complianceDocument.findUnique({ where: { id } });
  if (!doc) return Response.json({ error: "Document not found" }, { status: 404 });

  const form = await req.formData();
  const file = form.get("file") as File | null;

  if (!file) return Response.json({ error: "No file provided" }, { status: 400 });
  if (!ALLOWED_TYPES.includes(file.type)) return Response.json({ error: "Invalid file type" }, { status: 400 });
  if (file.size > MAX_SIZE) return Response.json({ error: "File must be under 5 MB" }, { status: 400 });

  const buffer = Buffer.from(await file.arrayBuffer());
  const entityId = doc.driverId ?? doc.vehicleId ?? "unknown";
  const storageKey = makeR2Key(entityId, doc.docType, file.name);

  // Upload to R2 before the DB transaction — if this fails we abort cleanly
  await uploadToR2(storageKey, buffer, file.type);

  try {
    const existing = await prisma.documentFile.findUnique({ where: { complianceDocumentId: id } });

    await prisma.$transaction(async (tx) => {
      if (existing) {
        await tx.documentFile.update({
          where: { complianceDocumentId: id },
          data: { fileName: file.name, mimeType: file.type, size: file.size, storageKey },
        });
      } else {
        await tx.documentFile.create({
          data: {
            complianceDocumentId: id,
            fileName: file.name,
            mimeType: file.type,
            size: file.size,
            storageKey,
          },
        });
      }
      await tx.complianceDocument.update({
        where: { id },
        data: { status: "pending_review" },
      });
      await tx.auditLog.create({
        data: {
          entityType: "compliance",
          entityId: id,
          action: "document_uploaded",
          metadata: { fileName: file.name, mimeType: file.type, size: file.size, storageKey },
        },
      });
    });

    // Clean up old R2 object if replaced
    if (existing && existing.storageKey !== storageKey) {
      await deleteFromR2(existing.storageKey).catch(() => {});
    }
  } catch (err) {
    // DB write failed — clean up the just-uploaded R2 object
    await deleteFromR2(storageKey).catch(() => {});
    throw err;
  }

  return Response.json({ ok: true });
}
