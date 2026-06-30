import { NextResponse } from "next/server";
import { withAuth } from "@workos-inc/authkit-nextjs";
import { prisma } from "@/lib/prisma";
import { getOperatorTenant } from "@/lib/utils/operator";

const ACTIVE_ORDER_STATUSES = ["booked", "assigned", "en_route", "arrived", "started"];

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
  if (!membership) {
    return NextResponse.json({ error: "Driver not on your roster" }, { status: 404 });
  }

  const activeOrders = await prisma.order.findMany({
    where: {
      driverId,
      tenantId: tenant.id,
      status: { in: ACTIVE_ORDER_STATUSES },
    },
    select: { id: true, status: true },
  });

  if (activeOrders.length > 0) {
    return NextResponse.json(
      {
        error: "Driver has active jobs — cannot remove from roster",
        activeOrders: activeOrders.map((o) => ({ id: o.id, status: o.status })),
      },
      { status: 409 }
    );
  }

  await prisma.$transaction(async (tx) => {
    await tx.operatorDriverMembership.delete({
      where: { tenantId_driverId: { tenantId: tenant.id, driverId } },
    });
    await tx.auditLog.create({
      data: {
        entityType: "driver",
        entityId: driverId,
        action: "roster.driver_removed",
        actorId: user.id,
        metadata: { tenantId: tenant.id },
      },
    });
  });

  return NextResponse.json({ ok: true });
}
