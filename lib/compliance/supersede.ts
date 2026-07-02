import type { TxClient } from "@/lib/prisma";
import { deleteFromR2 } from "@/lib/r2";

// Supersede any existing active (verified | pending_review) document of the same
// type for a driver or vehicle, purging its file content. A superseded record keeps
// only metadata (docType, status, review history) — PII minimization, not a fresh
// upload gated on it. Must be called before creating the replacement record.
export async function supersedeAndPurgeActiveDocs(
  tx: TxClient,
  target: { driverId: string; docType: string } | { vehicleId: string; docType: string },
  actorId: string
): Promise<void> {
  const where =
    "driverId" in target
      ? { driverId: target.driverId, docType: target.docType }
      : { vehicleId: target.vehicleId, docType: target.docType };

  const existingActive = await tx.complianceDocument.findMany({
    where: { ...where, status: { in: ["pending_review", "verified"] } },
    include: { file: true },
  });

  for (const old of existingActive) {
    await tx.complianceDocument.update({
      where: { id: old.id },
      data: { status: "superseded", supersededAt: new Date(), supersededBy: actorId },
    });
    if (old.file) {
      await deleteFromR2(old.file.storageKey);
      await tx.documentFile.delete({ where: { id: old.file.id } });
    }
  }
}
