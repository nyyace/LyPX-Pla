import { withAuth } from "@workos-inc/authkit-nextjs";
import { prisma } from "@/lib/prisma";
import { workos } from "@/lib/workos/auth";
import { NextResponse } from "next/server";
import { getOperatorTenant } from "@/lib/utils/operator";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user } = await withAuth({ ensureSignedIn: true });
  if (!user || await getOperatorTenant(user.id)) {
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

  try {
    if (tenant.workosInvitationId) {
      await workos.userManagement.resendInvitation(tenant.workosInvitationId);
    } else if (tenant.workosOrganisationId && tenant.contactEmail) {
      // Fallback: send a fresh invitation
      const invitation = await workos.userManagement.sendInvitation({
        email: tenant.contactEmail,
        organizationId: tenant.workosOrganisationId,
      });
      await prisma.tenant.update({
        where: { id },
        data: { workosInvitationId: invitation.id },
      });
    } else {
      return NextResponse.json({ error: "Cannot resend — no WorkOS invite data" }, { status: 400 });
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "WorkOS error";
    return NextResponse.json({ error: `WorkOS: ${message}` }, { status: 502 });
  }

  await prisma.auditLog.create({
    data: {
      entityType: "tenant",
      entityId: id,
      action: "operator_invite_resent",
      actorId: user.id,
      metadata: { contactEmail: tenant.contactEmail },
    },
  });

  return NextResponse.json({ ok: true });
}
