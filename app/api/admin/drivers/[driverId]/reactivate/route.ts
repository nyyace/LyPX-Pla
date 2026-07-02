import { NextResponse } from "next/server";
import { withAuth } from "@workos-inc/authkit-nextjs";
import { prisma, type TxClient } from "@/lib/prisma";
import { isAdminUser } from "@/lib/utils/admin";
import { reactivateDriver } from "@/lib/entities/reactivation";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ driverId: string }> }
) {
  const { user } = await withAuth({ ensureSignedIn: true });
  if (!user || !(await isAdminUser(user.id))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { driverId } = await params;

  const existing = await prisma.driver.findUnique({ where: { id: driverId }, select: { id: true, deletedAt: true } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!existing.deletedAt) return NextResponse.json({ error: "Driver is not removed — nothing to reactivate" }, { status: 409 });

  const body = await req.json().catch(() => ({})) as {
    firstName?: string; lastName?: string; phoneNumber?: string; licenseNumber?: string; licenseIssuedDate?: string | null;
  };

  const driver = await prisma.$transaction((tx: TxClient) =>
    reactivateDriver(tx, driverId, user.id, {
      ...(body.firstName !== undefined ? { firstName: body.firstName.trim() } : {}),
      ...(body.lastName !== undefined ? { lastName: body.lastName.trim() } : {}),
      ...(body.phoneNumber !== undefined ? { phoneNumber: body.phoneNumber.trim() } : {}),
      ...(body.licenseNumber !== undefined ? { licenseNumber: body.licenseNumber.trim() } : {}),
      ...(body.licenseIssuedDate !== undefined
        ? { licenseIssuedDate: body.licenseIssuedDate ? new Date(body.licenseIssuedDate) : null }
        : {}),
    })
  );

  return NextResponse.json(driver);
}
