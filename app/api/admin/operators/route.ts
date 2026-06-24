import { withAuth } from "@workos-inc/authkit-nextjs";
import { prisma } from "@/lib/prisma";
import { workos } from "@/lib/workos/auth";
import { NextResponse } from "next/server";
import { getOperatorTenant } from "@/lib/utils/operator";

async function assertAdmin(userId: string) {
  const tenant = await getOperatorTenant(userId);
  if (tenant) return false;
  return true;
}

// GET /api/admin/operators — list all operator tenants
export async function GET() {
  const { user } = await withAuth({ ensureSignedIn: true });
  if (!user || !(await assertAdmin(user.id))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const operators = await prisma.tenant.findMany({
    where: { tenantType: "operator", status: { not: "revoked" } },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    include: {
      preference: { select: { timezone: true, accentColour: true } },
      _count: { select: { driverMemberships: true, users: true } },
    },
  });

  return NextResponse.json(operators);
}

// POST /api/admin/operators — invite a new operator
export async function POST(req: Request) {
  const { user } = await withAuth({ ensureSignedIn: true });
  if (!user || !(await assertAdmin(user.id))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { companyName, contactName, contactEmail, contactPhone, marketplaceParticipation, timezone } = body as {
    companyName: string;
    contactName: string;
    contactEmail: string;
    contactPhone?: string;
    marketplaceParticipation?: boolean;
    timezone?: string;
  };

  if (!companyName?.trim() || !contactName?.trim() || !contactEmail?.trim()) {
    return NextResponse.json({ error: "Company name, contact name, and email are required" }, { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) {
    return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
  }

  // Create WorkOS organisation
  let orgId: string | null = null;
  let invitationId: string | null = null;
  let acceptInvitationUrl: string | null = null;

  try {
    const org = await workos.organizations.createOrganization({ name: companyName.trim() });
    orgId = org.id;

    const invitation = await workos.userManagement.sendInvitation({
      email: contactEmail.trim(),
      organizationId: org.id,
    });
    invitationId = invitation.id;
    acceptInvitationUrl = invitation.acceptInvitationUrl;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "WorkOS error";
    return NextResponse.json({ error: `WorkOS: ${message}` }, { status: 502 });
  }

  const now = new Date();

  const tenant = await prisma.$transaction(async (tx) => {
    const t = await tx.tenant.create({
      data: {
        name: companyName.trim(),
        tenantType: "operator",
        marketplaceParticipation: marketplaceParticipation ?? false,
        contactName: contactName.trim(),
        contactEmail: contactEmail.trim(),
        contactPhone: contactPhone?.trim() ?? null,
        status: "invited",
        workosOrganisationId: orgId,
        workosInvitationId: invitationId,
        invitedAt: now,
      },
    });

    await tx.tenantPreference.create({
      data: {
        tenantId: t.id,
        accentColour: "#E5A93C",
        timezone: timezone ?? "Asia/Singapore",
      },
    });

    await tx.auditLog.create({
      data: {
        entityType: "tenant",
        entityId: t.id,
        action: "operator_invited",
        actorId: user.id,
        metadata: { companyName: t.name, contactEmail, orgId },
      },
    });

    return t;
  });

  return NextResponse.json({ ...tenant, acceptInvitationUrl }, { status: 201 });
}
