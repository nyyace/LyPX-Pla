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
  if (!["invited", "revoked"].includes(tenant.status)) {
    return NextResponse.json({ error: "Operator cannot be re-invited in its current state" }, { status: 400 });
  }
  if (!tenant.workosOrganisationId || !tenant.contactEmail) {
    return NextResponse.json({ error: "Cannot resend — no WorkOS org data" }, { status: 400 });
  }

  let newInvitationId: string | null = null;

  try {
    if (tenant.status === "invited" && tenant.workosInvitationId) {
      // Still in invited state — try resending the existing invitation
      try {
        await workos.userManagement.resendInvitation(tenant.workosInvitationId);
      } catch {
        // Invitation may be expired — fall through to fresh invite
        const invitation = await workos.userManagement.sendInvitation({
          email: tenant.contactEmail,
          organizationId: tenant.workosOrganisationId,
        });
        newInvitationId = invitation.id;
      }
    } else {
      // Revoked or no prior invitation ID — always send a fresh invitation
      const invitation = await workos.userManagement.sendInvitation({
        email: tenant.contactEmail,
        organizationId: tenant.workosOrganisationId,
      });
      newInvitationId = invitation.id;
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "WorkOS error";
    return NextResponse.json({ error: `WorkOS: ${message}` }, { status: 502 });
  }

  await prisma.$transaction(async (tx) => {
    await tx.tenant.update({
      where: { id },
      data: {
        status: "invited",
        invitedAt: new Date(),
        ...(newInvitationId ? { workosInvitationId: newInvitationId } : {}),
      },
    });
    await tx.auditLog.create({
      data: {
        entityType: "tenant",
        entityId: id,
        action: "operator_invite_resent",
        actorId: user.id,
        metadata: { contactEmail: tenant.contactEmail, previousStatus: tenant.status },
      },
    });
  });

  return NextResponse.json({ ok: true });
}
