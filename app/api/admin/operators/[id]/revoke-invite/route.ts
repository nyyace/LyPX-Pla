import { withAuth } from "@workos-inc/authkit-nextjs";
import { prisma } from "@/lib/prisma";
import { workos } from "@/lib/workos/auth";
import { NextResponse } from "next/server";
import { isAdminUser } from "@/lib/utils/admin";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user } = await withAuth({ ensureSignedIn: true });
  if (!user || !(await isAdminUser(user.id))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const tenant = await prisma.tenant.findUnique({ where: { id } });

  if (!tenant || tenant.tenantType !== "operator") {
    return NextResponse.json({ error: "Operator not found" }, { status: 404 });
  }
  if (tenant.status !== "invited") {
    return NextResponse.json({ error: "Operator is not in invited state" }, { status: 400 });
  }

  if (tenant.workosInvitationId) {
    try {
      await workos.userManagement.revokeInvitation(tenant.workosInvitationId);
    } catch {
      // Invitation may already be expired/revoked — continue
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.tenant.update({
      where: { id },
      data: { status: "revoked" },
    });
    await tx.auditLog.create({
      data: {
        entityType: "tenant",
        entityId: id,
        action: "operator_invite_revoked",
        actorId: user.id,
        metadata: { contactEmail: tenant.contactEmail },
      },
    });
  });

  return NextResponse.json({ ok: true });
}
