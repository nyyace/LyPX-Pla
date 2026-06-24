import { withAuth } from "@workos-inc/authkit-nextjs";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user } = await withAuth({ ensureSignedIn: true });
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const request = await prisma.driverInviteRequest.findUnique({ where: { id } });
  if (!request) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (request.status !== "pending") {
    return NextResponse.json({ error: "Request is not pending" }, { status: 422 });
  }

  const body = await req.json().catch(() => ({})) as { adminNote?: string };

  await prisma.$transaction(async (tx) => {
    await tx.driverInviteRequest.update({
      where: { id },
      data: {
        status: "rejected",
        adminNote: body.adminNote?.trim() || null,
      },
    });

    await tx.auditLog.create({
      data: {
        entityType: "driver_invite_request",
        entityId: id,
        action: "driver_invite_rejected",
        actorId: user.id,
        metadata: { tenantId: request.tenantId, driverWhatsapp: request.driverWhatsapp },
      },
    });
  });

  return NextResponse.json({ success: true });
}
