import { NextResponse } from "next/server";
import { prisma, type TxClient } from "@/lib/prisma";
import { createHash } from "crypto";
import { sendWhatsAppTemplate } from "@/lib/whatsapp/client";

function makeIdentityHash(licenseNumber: string, nationalId: string): string {
  const normalized = `${licenseNumber.trim().toUpperCase()}::${nationalId.trim().toUpperCase()}`;
  return createHash("sha256").update(normalized).digest("hex");
}

interface DocumentInput {
  docType: string;
  expiryDate: string;
}

const VALID_DOC_TYPES = ["license", "insurance", "background_check", "registration", "inspection"];

export async function POST(req: Request) {
  const body = await req.json();
  const { verificationId, firstName, lastName, licenseNumber, nationalId, documents } = body;

  // Validate verification session
  if (!verificationId) {
    return NextResponse.json({ error: "Phone verification required" }, { status: 400 });
  }

  const verification = await prisma.phoneVerification.findUnique({
    where: { id: verificationId },
  });

  if (!verification?.verifiedAt) {
    return NextResponse.json({ error: "Phone not verified" }, { status: 400 });
  }
  // Session valid for 30 minutes after verification
  if (Date.now() - verification.verifiedAt.getTime() > 30 * 60 * 1000) {
    return NextResponse.json({ error: "Verification session expired" }, { status: 400 });
  }

  // Validate required fields
  if (!firstName?.trim() || !lastName?.trim() || !licenseNumber?.trim() || !nationalId?.trim()) {
    return NextResponse.json({ error: "All personal details required" }, { status: 400 });
  }

  if (!Array.isArray(documents) || documents.length === 0) {
    return NextResponse.json({ error: "At least one document required" }, { status: 400 });
  }

  for (const doc of documents as DocumentInput[]) {
    if (!VALID_DOC_TYPES.includes(doc.docType)) {
      return NextResponse.json({ error: `Invalid document type: ${doc.docType}` }, { status: 400 });
    }
    if (!doc.expiryDate || isNaN(Date.parse(doc.expiryDate))) {
      return NextResponse.json({ error: "Valid expiry date required for each document" }, { status: 400 });
    }
  }

  const identityHash = makeIdentityHash(licenseNumber, nationalId);
  const phone = verification.phone;

  let driverId: string;
  let isResubmission = false;

  const existing = await prisma.driver.findUnique({ where: { identityHash } });

  if (existing) {
    // Resubmission — add new documents and reset to pending if suspended
    isResubmission = true;
    driverId = existing.id;

    await prisma.$transaction(async (tx: TxClient) => {
      if (existing.complianceStatus === "suspended" || existing.complianceStatus === "active") {
        await tx.driver.update({
          where: { id: driverId },
          data: { complianceStatus: "pending", phoneNumber: phone },
        });
      }

      for (const doc of documents as DocumentInput[]) {
        await tx.complianceDocument.create({
          data: {
            entityType: "driver",
            driverId,
            docType: doc.docType,
            expiryDate: new Date(doc.expiryDate),
            status: "pending_review",
            verificationMethod: "manual",
          },
        });
      }

      await tx.auditLog.create({
        data: {
          entityType: "driver",
          entityId: driverId,
          action: "self_onboarding_resubmission",
          actorId: "self",
          metadata: { phone, docCount: documents.length },
        },
      });
    });
  } else {
    // New driver
    const driver = await prisma.$transaction(async (tx: TxClient) => {
      const d = await tx.driver.create({
        data: {
          identityHash,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          phoneNumber: phone,
          complianceStatus: "pending",
          sourceType: "self_submitted",
        },
      });

      for (const doc of documents as DocumentInput[]) {
        await tx.complianceDocument.create({
          data: {
            entityType: "driver",
            driverId: d.id,
            docType: doc.docType,
            expiryDate: new Date(doc.expiryDate),
            status: "pending_review",
            verificationMethod: "manual",
          },
        });
      }

      await tx.auditLog.create({
        data: {
          entityType: "driver",
          entityId: d.id,
          action: "self_onboarding_submitted",
          actorId: "self",
          metadata: { phone, docCount: documents.length },
        },
      });

      return d;
    });

    driverId = driver.id;
  }

  // WhatsApp notification — falls back gracefully if template not yet approved
  try {
    await sendWhatsAppTemplate({
      to: phone,
      templateKey: "hello_world",
      actorId: "system",
    });
  } catch {
    // Non-blocking — submission is still successful
  }

  return NextResponse.json({ driverId, isResubmission }, { status: 201 });
}
