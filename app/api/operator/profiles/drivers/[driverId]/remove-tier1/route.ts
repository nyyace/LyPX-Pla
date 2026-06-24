import { withAuth } from "@workos-inc/authkit-nextjs";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getOperatorTenant } from "@/lib/utils/operator";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ driverId: string }> }
) {
  const { user } = await withAuth({ ensureSignedIn: true });
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tenant = await getOperatorTenant(user.id);
  if (!tenant) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { driverId } = await params;

  const membership = await prisma.operatorDriverMembership.findUnique({
    where: { tenantId_driverId: { tenantId: tenant.id, driverId } },
  });
  if (!membership) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.operatorDriverMembership.update({
    where: { id: membership.id },
    data: { tier1Member: false },
  });

  await prisma.auditLog.create({
    data: {
      entityType: "driver_membership",
      entityId: membership.id,
      action: "tier1_removed",
      actorId: user.id,
      metadata: { driverId, tenantId: tenant.id, reason: "operator_removed" },
    },
  });

  return NextResponse.json({ success: true });
}
