import { NextResponse } from "next/server";
import { prisma, type TxClient } from "@/lib/prisma";
import { createHash } from "crypto";
import { uploadToR2, makeR2Key } from "@/lib/r2";
import { sendWhatsAppTemplate } from "@/lib/whatsapp/client";

const ALLOWED_MIMES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/heic",
  "application/pdf",
];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

function makeIdentityHash(licenseNumber: string, nric: string): string {
  const normalized = `${licenseNumber.trim().toUpperCase()}::${nric.trim().toUpperCase()}`;
  return createHash("sha256").update(normalized).digest("hex");
}

async function validateFile(
  file: FormDataEntryValue | null,
  fieldLabel: string,
  required: boolean
): Promise<{ buffer: Buffer; filename: string; mimeType: string } | null | NextResponse> {
  if (!file || typeof file === "string") {
    if (required) return NextResponse.json({ error: `${fieldLabel} is required` }, { status: 400 });
    return null;
  }
  const f = file as File;
  if (f.size === 0) {
    if (required) return NextResponse.json({ error: `${fieldLabel} is required` }, { status: 400 });
    return null;
  }
  if (f.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: `${fieldLabel} must be under 5 MB` }, { status: 400 });
  }
  if (!ALLOWED_MIMES.includes(f.type)) {
    return NextResponse.json({ error: `${fieldLabel}: only images (JPG, PNG, WEBP) and PDF are accepted` }, { status: 400 });
  }
  const buffer = Buffer.from(await f.arrayBuffer());
  return { buffer, filename: f.name, mimeType: f.type };
}

function isNextResponse(v: unknown): v is NextResponse {
  return v instanceof NextResponse;
}

export async function POST(req: Request) {
  const form = await req.formData();

  const verificationId = form.get("verificationId") as string | null;
  if (!verificationId) {
    return NextResponse.json({ error: "Phone verification required" }, { status: 400 });
  }

  const verification = await prisma.phoneVerification.findUnique({ where: { id: verificationId } });
  if (!verification?.verifiedAt) {
    return NextResponse.json({ error: "Phone not verified" }, { status: 400 });
  }
  if (Date.now() - verification.verifiedAt.getTime() > 30 * 60 * 1000) {
    return NextResponse.json({ error: "Verification session expired — please restart" }, { status: 400 });
  }

  // ── Driver fields ──────────────────────────────────────────────────────────
  const firstName = (form.get("firstName") as string | null)?.trim();
  const lastName = (form.get("lastName") as string | null)?.trim();
  const nric = (form.get("nric") as string | null)?.trim().toUpperCase();
  const licenseNumber = (form.get("licenseNumber") as string | null)?.trim().toUpperCase();
  const licenseIssuedDateRaw = form.get("licenseIssuedDate") as string | null;

  if (!firstName || !lastName || !nric || !licenseNumber || !licenseIssuedDateRaw) {
    return NextResponse.json({ error: "All driver details are required" }, { status: 400 });
  }

  const licenseIssuedDate = new Date(licenseIssuedDateRaw);
  if (isNaN(licenseIssuedDate.getTime())) {
    return NextResponse.json({ error: "Invalid license issued date" }, { status: 400 });
  }

  // ── Driver document files ──────────────────────────────────────────────────
  const nricFileResult = await validateFile(form.get("nricFile"), "NRIC document", true);
  if (isNextResponse(nricFileResult)) return nricFileResult;

  const licenseFileResult = await validateFile(form.get("licenseFile"), "Driver license document", true);
  if (isNextResponse(licenseFileResult)) return licenseFileResult;

  // ── Vehicle fields ─────────────────────────────────────────────────────────
  const plateNumber = (form.get("plateNumber") as string | null)?.trim().toUpperCase();
  const vehicleMake = (form.get("vehicleMake") as string | null)?.trim();
  const vehicleModel = (form.get("vehicleModel") as string | null)?.trim();
  const isOwned = form.get("isOwned") === "true";
  const rentalEndDateRaw = form.get("rentalEndDate") as string | null;
  const insuranceCompany = (form.get("insuranceCompany") as string | null)?.trim();
  const insuranceExpiryRaw = form.get("insuranceExpiry") as string | null;

  if (!plateNumber) {
    return NextResponse.json({ error: "Vehicle plate number is required" }, { status: 400 });
  }
  if (!insuranceCompany || !insuranceExpiryRaw) {
    return NextResponse.json({ error: "Insurance details are required" }, { status: 400 });
  }

  let rentalEndDate: Date | null = null;
  if (!isOwned) {
    if (!rentalEndDateRaw) {
      return NextResponse.json({ error: "Rental agreement end date is required" }, { status: 400 });
    }
    rentalEndDate = new Date(rentalEndDateRaw);
  }

  const insuranceExpiry = new Date(insuranceExpiryRaw);
  if (isNaN(insuranceExpiry.getTime())) {
    return NextResponse.json({ error: "Invalid insurance expiry date" }, { status: 400 });
  }

  // ── Vehicle document files ─────────────────────────────────────────────────
  const vehicleRegFileResult = await validateFile(form.get("vehicleRegFile"), "Vehicle registration document", true);
  if (isNextResponse(vehicleRegFileResult)) return vehicleRegFileResult;

  const rentalAgreementFileResult = await validateFile(form.get("rentalAgreementFile"), "Rental agreement", !isOwned);
  if (isNextResponse(rentalAgreementFileResult)) return rentalAgreementFileResult;

  const insuranceFileResult = await validateFile(form.get("insuranceFile"), "Insurance document", true);
  if (isNextResponse(insuranceFileResult)) return insuranceFileResult;

  const phone = verification.phone;
  const identityHash = makeIdentityHash(licenseNumber, nric);

  // ── Existing driver check (resubmission) ───────────────────────────────────
  const existingDriver = await prisma.driver.findUnique({ where: { identityHash } });
  const isResubmission = !!existingDriver;

  // ── Upload all files to R2 before DB transaction ───────────────────────────
  // Use a placeholder driverId key segment for new drivers; replaced after driver creation below.
  // For simplicity, upload to R2 using identityHash as temporary namespace — key is stable across
  // resubmissions for the same driver since hash is deterministic.
  const driverR2Prefix = existingDriver?.id ?? `pending/${identityHash.slice(0, 12)}`;

  const nricKey = nricFileResult ? makeR2Key(driverR2Prefix, "nric", nricFileResult.filename) : null;
  const licenseKey = licenseFileResult ? makeR2Key(driverR2Prefix, "license", licenseFileResult.filename) : null;

  const r2Uploads: Promise<void>[] = [];
  if (nricFileResult && nricKey) {
    r2Uploads.push(uploadToR2(nricKey, nricFileResult.buffer, nricFileResult.mimeType));
  }
  if (licenseFileResult && licenseKey) {
    r2Uploads.push(uploadToR2(licenseKey, licenseFileResult.buffer, licenseFileResult.mimeType));
  }

  // We need the vehicle id for R2 keys — allocate after DB writes, so upload vehicle docs inside tx
  await Promise.all(r2Uploads);

  let resultDriverId: string;

  await prisma.$transaction(async (tx: TxClient) => {
    let driver;

    if (isResubmission && existingDriver) {
      driver = await tx.driver.update({
        where: { id: existingDriver.id },
        data: {
          phoneNumber: phone,
          firstName: firstName!,
          lastName: lastName!,
          licenseNumber,
          licenseIssuedDate,
          ...(existingDriver.complianceStatus !== "active"
            ? { complianceStatus: "pending" }
            : {}),
        },
      });
    } else {
      driver = await tx.driver.create({
        data: {
          identityHash,
          firstName: firstName!,
          lastName: lastName!,
          phoneNumber: phone,
          licenseNumber,
          licenseIssuedDate,
          complianceStatus: "pending",
          sourceType: "self_submitted",
        },
      });
    }

    resultDriverId = driver.id;

    // Driver: NRIC document
    const nricDoc = await tx.complianceDocument.create({
      data: {
        entityType: "driver",
        driverId: driver.id,
        docType: "nric",
        expiryDate: new Date("2099-12-31"),
        status: "pending_review",
        verificationMethod: "manual",
      },
    });
    if (nricFileResult && nricKey) {
      await tx.documentFile.create({
        data: {
          complianceDocumentId: nricDoc.id,
          fileName: nricFileResult.filename,
          mimeType: nricFileResult.mimeType,
          size: nricFileResult.buffer.length,
          storageKey: nricKey,
        },
      });
    }

    // Driver: License document
    const licenseDoc = await tx.complianceDocument.create({
      data: {
        entityType: "driver",
        driverId: driver.id,
        docType: "license",
        issuedDate: licenseIssuedDate,
        expiryDate: new Date("2099-12-31"),
        status: "pending_review",
        verificationMethod: "manual",
      },
    });
    if (licenseFileResult && licenseKey) {
      await tx.documentFile.create({
        data: {
          complianceDocumentId: licenseDoc.id,
          fileName: licenseFileResult.filename,
          mimeType: licenseFileResult.mimeType,
          size: licenseFileResult.buffer.length,
          storageKey: licenseKey,
        },
      });
    }

    // Vehicle — upsert by plateNumber
    let vehicle = await tx.vehicle.findUnique({ where: { plateNumber: plateNumber! } });
    if (!vehicle) {
      vehicle = await tx.vehicle.create({
        data: {
          registeredByTenantId: "lypx_direct",
          make: vehicleMake ?? "—",
          model: vehicleModel ?? "—",
          plateNumber: plateNumber!,
          insuranceCompany: insuranceCompany ?? undefined,
        },
      });
    } else {
      vehicle = await tx.vehicle.update({
        where: { id: vehicle.id },
        data: { insuranceCompany: insuranceCompany ?? undefined },
      });
    }

    const vehicleR2Prefix = vehicle.id;

    // VehicleOwnership
    const existingOwnership = await tx.vehicleOwnership.findFirst({
      where: { vehicleId: vehicle.id, driverId: driver.id },
    });
    if (!existingOwnership) {
      await tx.vehicleOwnership.create({
        data: {
          vehicleId: vehicle.id,
          driverId: driver.id,
          relationshipType: isOwned ? "owned" : "contracted",
          contractStatus: isOwned ? null : "active",
          contractExpiry: rentalEndDate ?? undefined,
        },
      });
    }

    // Vehicle: Registration document
    const regDoc = await tx.complianceDocument.create({
      data: {
        entityType: "vehicle",
        vehicleId: vehicle.id,
        docType: "registration",
        expiryDate: new Date("2099-12-31"),
        status: "pending_review",
        verificationMethod: "manual",
      },
    });
    if (vehicleRegFileResult) {
      const regKey = makeR2Key(vehicleR2Prefix, "registration", vehicleRegFileResult.filename);
      await uploadToR2(regKey, vehicleRegFileResult.buffer, vehicleRegFileResult.mimeType);
      await tx.documentFile.create({
        data: {
          complianceDocumentId: regDoc.id,
          fileName: vehicleRegFileResult.filename,
          mimeType: vehicleRegFileResult.mimeType,
          size: vehicleRegFileResult.buffer.length,
          storageKey: regKey,
        },
      });
    }

    // Vehicle: Rental agreement (if not owned)
    if (!isOwned && rentalAgreementFileResult) {
      const rentalDoc = await tx.complianceDocument.create({
        data: {
          entityType: "vehicle",
          vehicleId: vehicle.id,
          docType: "rental_agreement",
          expiryDate: rentalEndDate!,
          status: "pending_review",
          verificationMethod: "manual",
        },
      });
      const rentalKey = makeR2Key(vehicleR2Prefix, "rental_agreement", rentalAgreementFileResult.filename);
      await uploadToR2(rentalKey, rentalAgreementFileResult.buffer, rentalAgreementFileResult.mimeType);
      await tx.documentFile.create({
        data: {
          complianceDocumentId: rentalDoc.id,
          fileName: rentalAgreementFileResult.filename,
          mimeType: rentalAgreementFileResult.mimeType,
          size: rentalAgreementFileResult.buffer.length,
          storageKey: rentalKey,
        },
      });
    }

    // Vehicle: Insurance document
    const insDoc = await tx.complianceDocument.create({
      data: {
        entityType: "vehicle",
        vehicleId: vehicle.id,
        docType: "insurance",
        expiryDate: insuranceExpiry,
        status: "pending_review",
        verificationMethod: "manual",
      },
    });
    if (insuranceFileResult) {
      const insKey = makeR2Key(vehicleR2Prefix, "insurance", insuranceFileResult.filename);
      await uploadToR2(insKey, insuranceFileResult.buffer, insuranceFileResult.mimeType);
      await tx.documentFile.create({
        data: {
          complianceDocumentId: insDoc.id,
          fileName: insuranceFileResult.filename,
          mimeType: insuranceFileResult.mimeType,
          size: insuranceFileResult.buffer.length,
          storageKey: insKey,
        },
      });
    }

    // DriverSubmission record (upsert for resubmissions)
    await tx.driverSubmission.upsert({
      where: { driverId: driver.id },
      create: {
        driverId: driver.id,
        fullName: `${firstName} ${lastName}`,
        nricNumber: nric!,
        phoneNumber: phone,
        licenceNumber: licenseNumber!,
        vehicleMake: vehicleMake ?? null,
        vehicleModel: vehicleModel ?? null,
        vehiclePlate: plateNumber ?? null,
        vehicleRelationship: isOwned ? "owned" : "contracted",
      },
      update: {
        submittedAt: new Date(),
        fullName: `${firstName} ${lastName}`,
        nricNumber: nric!,
        phoneNumber: phone,
        licenceNumber: licenseNumber!,
        vehicleMake: vehicleMake ?? null,
        vehicleModel: vehicleModel ?? null,
        vehiclePlate: plateNumber ?? null,
        vehicleRelationship: isOwned ? "owned" : "contracted",
        // Clear prior review state on resubmission
        adminNotes: null,
        flagReason: null,
        rejectionReason: null,
        reviewedBy: null,
        reviewedAt: null,
      },
    });

    await tx.auditLog.create({
      data: {
        entityType: "driver",
        entityId: driver.id,
        action: isResubmission ? "self_onboarding_resubmission" : "self_onboarding_submitted",
        actorId: "self",
        metadata: { phone, plateNumber, isOwned, isResubmission },
      },
    });
  });

  // WhatsApp notification — non-blocking
  try {
    await sendWhatsAppTemplate({
      to: phone,
      templateKey: "hello_world",
      entityType: "driver",
      entityId: resultDriverId!,
      actorId: "system",
    });
  } catch {
    // Non-blocking
  }

  return NextResponse.json({ driverId: resultDriverId!, isResubmission }, { status: 201 });
}
