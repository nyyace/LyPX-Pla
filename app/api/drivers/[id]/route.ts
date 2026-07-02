import { NextResponse } from "next/server";
import { withAuth } from "@workos-inc/authkit-nextjs";
import { prisma, type TxClient } from "@/lib/prisma";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const driver = await prisma.driver.findUnique({
    where: { id },
    include: {
      documents: { orderBy: { expiryDate: "asc" } },
      memberships: { include: { tenant: true } },
      vehicleOwnerships: { include: { vehicle: true } },
    },
  });

  if (!driver) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(driver);
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user } = await withAuth({ ensureSignedIn: true });
  const { id } = await params;
  const body = await req.json();
  const allowedFields = ["centralPoolEligible", "tier2PartnerEligible", "phoneNumber", "firstName", "lastName"];
  const updates: Record<string, unknown> = {};

  for (const field of allowedFields) {
    if (field in body) updates[field] = body[field];
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  const driver = await prisma.$transaction(async (tx: TxClient) => {
    const d = await tx.driver.update({ where: { id }, data: updates });
    await tx.auditLog.create({
      data: {
        entityType: "driver",
        entityId: id,
        action: "driver_updated",
        actorId: user.id,
        metadata: updates as object,
      },
    });
    return d;
  });

  return NextResponse.json(driver);
}
