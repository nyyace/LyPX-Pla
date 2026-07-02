import { NextResponse } from "next/server";
import { withAuth } from "@workos-inc/authkit-nextjs";
import { prisma, type TxClient } from "@/lib/prisma";
import { createHash } from "crypto";
import { normalizePhone } from "@/lib/utils/normalizePhone";

function makeIdentityHash(licenseNumber: string, nationalId: string): string {
  const normalized = `${licenseNumber.trim().toUpperCase()}::${nationalId.trim().toUpperCase()}`;
  return createHash("sha256").update(normalized).digest("hex");
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const q = searchParams.get("q");

  const drivers = await prisma.driver.findMany({
    where: {
      deletedAt: null,
      ...(status ? { complianceStatus: status } : {}),
      ...(q
        ? {
            OR: [
              { firstName: { contains: q, mode: "insensitive" } },
              { lastName: { contains: q, mode: "insensitive" } },
              { phoneNumber: { contains: q } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { documents: true } } },
  });

  return NextResponse.json(drivers);
}

export async function POST(req: Request) {
  const { user } = await withAuth({ ensureSignedIn: true });
  const body = await req.json();
  const { firstName, lastName, phoneNumber, licenseNumber, nationalId, relationshipType } = body;

  if (!firstName || !lastName || !phoneNumber || !licenseNumber || !nationalId) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const normalizedPhone = normalizePhone(phoneNumber);
  if (!normalizedPhone) {
    return NextResponse.json({ error: "Invalid phone number format" }, { status: 400 });
  }

  const identityHash = makeIdentityHash(licenseNumber, nationalId);

  const existing = await prisma.driver.findFirst({ where: { identityHash } });
  if (existing && !existing.deletedAt) {
    return NextResponse.json(
      { error: "Driver already exists in registry", existingId: existing.id },
      { status: 409 }
    );
  }
  if (existing && existing.deletedAt) {
    return NextResponse.json(
      { error: "A driver with this identity was previously removed", reactivatable: true, driverId: existing.id },
      { status: 409 }
    );
  }

  const driver = await prisma.$transaction(async (tx: TxClient) => {
    const d = await tx.driver.create({
      data: {
        identityHash,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phoneNumber: normalizedPhone,
        licenseNumber: licenseNumber.trim(),
      },
    });

    await tx.auditLog.create({
      data: {
        entityType: "driver",
        entityId: d.id,
        action: "driver_created",
        actorId: user.id,
        metadata: { firstName, lastName, phoneNumber, relationshipType },
      },
    });

    return d;
  });

  return NextResponse.json(driver, { status: 201 });
}
