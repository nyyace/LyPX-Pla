import { withAuth } from "@workos-inc/authkit-nextjs";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getOperatorTenant } from "@/lib/utils/operator";

const CANCELLABLE = ["pending", "approved", "sent"];

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user } = await withAuth({ ensureSignedIn: true });
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tenant = await getOperatorTenant(user.id);
  if (!tenant) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;

  const invite = await prisma.driverInviteRequest.findUnique({ where: { id } });
  if (!invite || invite.tenantId !== tenant.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (!CANCELLABLE.includes(invite.status)) {
    return NextResponse.json(
      { error: "This invite has already been resolved" },
      { status: 422 }
    );
  }

  await prisma.$transaction(async (tx) => {
    await tx.driverInviteRequest.update({
      where: { id },
      data: { status: "cancelled" },
    });

    await tx.auditLog.create({
      data: {
        entityType: "driver_invite_request",
        entityId: id,
        action: "invite_cancelled",
        actorId: user.id,
        metadata: { driverWhatsapp: invite.driverWhatsapp },
      },
    });
  });

  return NextResponse.json({ success: true });
}
