import { prisma } from "@/lib/prisma";
import { workos } from "@/lib/workos/auth";
import { UsersPageClient } from "@/components/users/UsersPageClient";

const ADMIN_ORG_ID = process.env.WORKOS_ADMIN_ORG_ID;

async function getOperators() {
  return prisma.tenant.findMany({
    where: { tenantType: "operator" },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    include: {
      preference: { select: { timezone: true } },
      _count: { select: { driverMemberships: true, users: true } },
    },
  });
}

async function getAdminUsers() {
  if (!ADMIN_ORG_ID) return [];
  try {
    const memberships = await workos.userManagement.listOrganizationMemberships({
      organizationId: ADMIN_ORG_ID,
      limit: 100,
    });
    const users = await Promise.all(
      memberships.data.map(async (m) => {
        try {
          const u = await workos.userManagement.getUser(m.userId);
          return {
            id: u.id,
            email: u.email,
            firstName: u.firstName,
            lastName: u.lastName,
            emailVerified: u.emailVerified,
            createdAt: u.createdAt,
            membershipStatus: m.status,
          };
        } catch {
          return null;
        }
      })
    );
    return users.filter(Boolean) as NonNullable<(typeof users)[number]>[];
  } catch {
    return [];
  }
}

export default async function UsersPage() {
  const [operators, adminUsers] = await Promise.all([getOperators(), getAdminUsers()]);

  const serializedOperators = operators.map((op) => ({
    id: op.id,
    name: op.name,
    status: op.status ?? "active",
    contactName: op.contactName ?? null,
    contactEmail: op.contactEmail ?? null,
    contactPhone: op.contactPhone ?? null,
    marketplaceParticipation: op.marketplaceParticipation,
    workosOrganisationId: op.workosOrganisationId ?? null,
    workosInvitationId: op.workosInvitationId ?? null,
    invitedAt: op.invitedAt?.toISOString() ?? null,
    activatedAt: op.activatedAt?.toISOString() ?? null,
    createdAt: op.createdAt.toISOString(),
    preference: op.preference,
    driverCount: op._count.driverMemberships,
    userCount: op._count.users,
  }));

  return (
    <UsersPageClient
      operators={serializedOperators}
      adminUsers={adminUsers.map((u) => ({ ...u, createdAt: u.createdAt?.toString() ?? null }))}
      adminOrgConfigured={!!ADMIN_ORG_ID}
    />
  );
}
