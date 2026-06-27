import { NextResponse } from "next/server";
import { prisma, type TxClient } from "@/lib/prisma";
import { createHash } from "crypto";
import { uploadToR2, makeR2Key } from "@/lib/r2";
import { sendWhatsAppTemplate } from "@/lib/whatsapp/client";

const ALLOWED_MIMES = [
  "image/jpeg", "image/jpg", "image/png", "image/webp", "image/heic", "application/pdf",
];
const MAX_FILE_SIZE = 5 * 1024 * 1024;

function makeIdentityHash(drivingLicenceNumber: string, nricNumber: string): string {
  const normalized = `${drivingLicenceNumber.trim().toUpperCase()}::${nricNumber.trim().toUpperCase()}`;
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
    return NextResponse.json({ error: `${fieldLabel}: only images and PDF accepted` }, { status: 400 });
  }
  return { buffer: Buffer.from(await f.arrayBuffer()), filename: f.name, mimeType: f.type };
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

  // ── Personal fields ────────────────────────────────────────────────────────
  const firstName = (form.get("firstName") as string | null)?.trim();
  const lastName = (form.get("lastName") as string | null)?.trim();
  const nricNumber = (form.get("nricNumber") as string | null)?.trim().toUpperCase();

  if (!firstName || !lastName || !nricNumber) {
    return NextResponse.json({ error: "Personal details are required" }, { status: 400 });
  }

  // ── Driving credentials ───────────────────────────────────────────────────
  const drivingLicenceNumber = (form.get("drivingLicenceNumber") as string | null)?.trim().toUpperCase();
  const drivingLicenceIssuedDateRaw = form.get("drivingLicenceIssuedDate") as string | null;
  const vocationalLicenceNumber = (form.get("vocationalLicenceNumber") as string | null)?.trim().toUpperCase();
  const vocationalLicenceExpiryDateRaw = form.get("vocationalLicenceExpiryDate") as string | null;

  if (!drivingLicenceNumber || !drivingLicenceIssuedDateRaw || !vocationalLicenceNumber || !vocationalLicenceExpiryDateRaw) {
    return NextResponse.json({ error: "Driving credential fields are required" }, { status: 400 });
  }

  const drivingLicenceIssuedDate = new Date(drivingLicenceIssuedDateRaw);
  const vocationalLicenceExpiryDate = new Date(vocationalLicenceExpiryDateRaw);

  if (isNaN(drivingLicenceIssuedDate.getTime()) || isNaN(vocationalLicenceExpiryDate.getTime())) {
    return NextResponse.json({ error: "Invalid date format" }, { status: 400 });
  }
  if (drivingLicenceIssuedDate >= new Date()) {
    return NextResponse.json({ error: "Driving licence issued date must be in the past" }, { status: 400 });
  }
  if (vocationalLicenceExpiryDate <= new Date()) {
    return NextResponse.json({ error: "Vocational licence is expired — contact admin" }, { status: 400 });
  }

  // ── Required document files ───────────────────────────────────────────────
  const nricFileResult = await validateFile(form.get("nricFile"), "NRIC / Passport document", true);
  if (isNextResponse(nricFileResult)) return nricFileResult;

  const drivingLicenceFileResult = await validateFile(form.get("drivingLicenceFile"), "Driving licence document", true);
  if (isNextResponse(drivingLicenceFileResult)) return drivingLicenceFileResult;

  const vocationalLicenceFileResult = await validateFile(form.get("vocationalLicenceFile"), "Vocational licence document", true);
  if (isNextResponse(vocationalLicenceFileResult)) return vocationalLicenceFileResult;

  const vocationalLicenceExpiryFileResult = await validateFile(form.get("vocationalLicenceExpiryFile"), "Vocational licence expiry page", true);
  if (isNextResponse(vocationalLicenceExpiryFileResult)) return vocationalLicenceExpiryFileResult;

  // ── Vehicle fields (optional) ─────────────────────────────────────────────
  const vehiclePlate = (form.get("vehiclePlate") as string | null)?.trim().toUpperCase() || null;
  const vehicleMake = (form.get("vehicleMake") as string | null)?.trim() || null;
  const vehicleModel = (form.get("vehicleModel") as string | null)?.trim() || null;
  const vehicleRelationship = (form.get("vehicleRelationship") as string | null) ?? "owned";
  const hasVehicle = !!vehiclePlate;

  const vehicleLogCardFileResult = hasVehicle
    ? await validateFile(form.get("vehicleLogCardFile"), "Vehicle log card", true)
    : null;
  if (isNextResponse(vehicleLogCardFileResult)) return vehicleLogCardFileResult;

  const rentalAgreementFileResult = hasVehicle && vehicleRelationship === "rented"
    ? await validateFile(form.get("rentalAgreementFile"), "Rental agreement", true)
    : null;
  if (isNextResponse(rentalAgreementFileResult)) return rentalAgreementFileResult;

  const phone = verification.phone;
  const identityHash = makeIdentityHash(drivingLicenceNumber!, nricNumber!);

  const existingDriver = await prisma.driver.findUnique({ where: { identityHash } });
  const isResubmission = !!existingDriver;

  // ── Upload driver files to R2 before transaction ──────────────────────────
  const driverPrefix = existingDriver?.id ?? `pending/${identityHash.slice(0, 12)}`;

  const nricKey = nricFileResult ? makeR2Key(driverPrefix, "nric", nricFileResult.filename) : null;
  const drivingLicenceKey = drivingLicenceFileResult ? makeR2Key(driverPrefix, "driving_licence", drivingLicenceFileResult.filename) : null;
  const vocationalLicenceKey = vocationalLicenceFileResult ? makeR2Key(driverPrefix, "vocational_licence", vocationalLicenceFileResult.filename) : null;
  const vocationalLicenceExpiryKey = vocationalLicenceExpiryFileResult ? makeR2Key(driverPrefix, "vocational_licence_expiry", vocationalLicenceExpiryFileResult.filename) : null;

  await Promise.all([
    nricFileResult && nricKey ? uploadToR2(nricKey, nricFileResult.buffer, nricFileResult.mimeType) : null,
    drivingLicenceFileResult && drivingLicenceKey ? uploadToR2(drivingLicenceKey, drivingLicenceFileResult.buffer, drivingLicenceFileResult.mimeType) : null,
    vocationalLicenceFileResult && vocationalLicenceKey ? uploadToR2(vocationalLicenceKey, vocationalLicenceFileResult.buffer, vocationalLicenceFileResult.mimeType) : null,
    vocationalLicenceExpiryFileResult && vocationalLicenceExpiryKey ? uploadToR2(vocationalLicenceExpiryKey, vocationalLicenceExpiryFileResult.buffer, vocationalLicenceExpiryFileResult.mimeType) : null,
  ].filter(Boolean) as Promise<void>[]);

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
          licenseNumber: drivingLicenceNumber,
          licenseIssuedDate: drivingLicenceIssuedDate,
          ...(existingDriver.complianceStatus !== "active" ? { complianceStatus: "pending" } : {}),
        },
      });
    } else {
      driver = await tx.driver.create({
        data: {
          identityHash,
          firstName: firstName!,
          lastName: lastName!,
          phoneNumber: phone,
          licenseNumber: drivingLicenceNumber,
          licenseIssuedDate: drivingLicenceIssuedDate,
          complianceStatus: "pending",
          sourceType: "self_submitted",
        },
      });
    }

    resultDriverId = driver.id;

    // Helper to upsert a compliance document + file record
    async function createDocWithFile(
      docData: Parameters<TxClient["complianceDocument"]["create"]>[0]["data"],
      fileResult: { buffer: Buffer; filename: string; mimeType: string } | null,
      storageKey: string | null
    ) {
      const doc = await tx.complianceDocument.create({ data: docData });
      if (fileResult && storageKey) {
        await tx.documentFile.create({
          data: {
            complianceDocumentId: doc.id,
            fileName: fileResult.filename,
            mimeType: fileResult.mimeType,
            size: fileResult.buffer.length,
            storageKey,
          },
        });
      }
      return doc;
    }

    // 1. NRIC document
    await createDocWithFile({
      entityType: "driver", driverId: driver.id,
      docType: "nric",
      expiryDate: new Date("2099-12-31"),
      status: "pending_review", verificationMethod: "manual",
    }, nricFileResult, nricKey);

    // 2. Driving licence
    await createDocWithFile({
      entityType: "driver", driverId: driver.id,
      docType: "driving_licence",
      issuedDate: drivingLicenceIssuedDate,
      expiryDate: new Date("2099-12-31"),
      status: "pending_review", verificationMethod: "manual",
    }, drivingLicenceFileResult, drivingLicenceKey);

    // 3. Vocational licence
    await createDocWithFile({
      entityType: "driver", driverId: driver.id,
      docType: "vocational_licence",
      expiryDate: new Date("2099-12-31"),
      status: "pending_review", verificationMethod: "manual",
    }, vocationalLicenceFileResult, vocationalLicenceKey);

    // 4. Vocational licence expiry page — expiry date is tracked and evaluated by compliance sweep
    await createDocWithFile({
      entityType: "driver", driverId: driver.id,
      docType: "vocational_licence_expiry",
      expiryDate: vocationalLicenceExpiryDate,
      status: "pending_review", verificationMethod: "manual",
    }, vocationalLicenceExpiryFileResult, vocationalLicenceExpiryKey);

    // 5+6. Vehicle documents (optional)
    if (hasVehicle && vehiclePlate) {
      let vehicle = await tx.vehicle.findUnique({ where: { plateNumber: vehiclePlate } });
      if (!vehicle) {
        vehicle = await tx.vehicle.create({
          data: {
            registeredByTenantId: "lypx_direct",
            make: vehicleMake ?? "—",
            model: vehicleModel ?? "—",
            plateNumber: vehiclePlate,
          },
        });
      } else {
        vehicle = await tx.vehicle.update({
          where: { id: vehicle.id },
          data: {
            make: vehicleMake && vehicleMake !== "" ? vehicleMake : vehicle.make,
            model: vehicleModel && vehicleModel !== "" ? vehicleModel : vehicle.model,
          },
        });
      }

      const existingOwnership = await tx.vehicleOwnership.findFirst({
        where: { vehicleId: vehicle.id, driverId: driver.id },
      });
      if (!existingOwnership) {
        await tx.vehicleOwnership.create({
          data: {
            vehicleId: vehicle.id,
            driverId: driver.id,
            relationshipType: vehicleRelationship === "rented" ? "contracted" : "owned",
            contractStatus: vehicleRelationship === "rented" ? "active" : null,
          },
        });
      }

      // Vehicle log card
      if (vehicleLogCardFileResult) {
        const logCardKey = makeR2Key(vehicle.id, "vehicle_log_card", vehicleLogCardFileResult.filename);
        await uploadToR2(logCardKey, vehicleLogCardFileResult.buffer, vehicleLogCardFileResult.mimeType);
        await createDocWithFile({
          entityType: "vehicle", vehicleId: vehicle.id,
          docType: "vehicle_log_card",
          expiryDate: new Date("2099-12-31"),
          status: "pending_review", verificationMethod: "manual",
        }, vehicleLogCardFileResult, logCardKey);
      }

      // Rental agreement
      if (vehicleRelationship === "rented" && rentalAgreementFileResult) {
        const rentalKey = makeR2Key(vehicle.id, "rental_agreement", rentalAgreementFileResult.filename);
        await uploadToR2(rentalKey, rentalAgreementFileResult.buffer, rentalAgreementFileResult.mimeType);
        await createDocWithFile({
          entityType: "vehicle", vehicleId: vehicle.id,
          docType: "rental_agreement",
          expiryDate: new Date("2099-12-31"),
          status: "pending_review", verificationMethod: "manual",
        }, rentalAgreementFileResult, rentalKey);
      }
    }

    // DriverSubmission upsert
    await tx.driverSubmission.upsert({
      where: { driverId: driver.id },
      create: {
        driverId: driver.id,
        firstName: firstName!,
        lastName: lastName!,
        nricNumber: nricNumber!,
        phoneNumber: phone,
        drivingLicenceNumber: drivingLicenceNumber!,
        drivingLicenceIssuedDate,
        vocationalLicenceNumber: vocationalLicenceNumber!,
        vocationalLicenceExpiryDate,
        vehicleMake: vehicleMake ?? null,
        vehicleModel: vehicleModel ?? null,
        vehiclePlate: vehiclePlate ?? null,
        vehicleRelationship: vehiclePlate ? vehicleRelationship : null,
      },
      update: {
        submittedAt: new Date(),
        firstName: firstName!,
        lastName: lastName!,
        nricNumber: nricNumber!,
        phoneNumber: phone,
        drivingLicenceNumber: drivingLicenceNumber!,
        drivingLicenceIssuedDate,
        vocationalLicenceNumber: vocationalLicenceNumber!,
        vocationalLicenceExpiryDate,
        vehicleMake: vehicleMake ?? null,
        vehicleModel: vehicleModel ?? null,
        vehiclePlate: vehiclePlate ?? null,
        vehicleRelationship: vehiclePlate ? vehicleRelationship : null,
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
        metadata: { phone, vehiclePlate, vehicleRelationship: hasVehicle ? vehicleRelationship : null, isResubmission },
      },
    });
  });

  try {
    await sendWhatsAppTemplate({
      to: phone,
      templateKey: "onboarding_submitted",
      entityType: "driver",
      entityId: resultDriverId!,
      actorId: "system",
    });
  } catch {
    // Non-blocking
  }

  return NextResponse.json({ driverId: resultDriverId!, isResubmission }, { status: 201 });
}
