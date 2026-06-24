import { prisma } from "@/lib/prisma";
import { DEFAULT_ACCENT } from "./theme";

// Called on first operator login — WorkOS sets organizationId on the session
// when a user authenticates via an org invitation. We use it to find the
// matching Tenant and create the TenantUser link.
export async function provisionOperatorUser(userId: string, orgId: string): Promise<boolean> {
  const tenant = await prisma.tenant.findFirst({
    where: { workosOrganisationId: orgId, tenantType: "operator" },
  });
  if (!tenant) return false;

  await prisma.tenantUser.upsert({
    where: { userId_tenantId: { userId, tenantId: tenant.id } },
    create: { userId, tenantId: tenant.id, role: "admin" },
    update: {},
  });

  return true;
}

export async function getOperatorTenant(userId: string) {
  const mapping = await prisma.tenantUser.findFirst({
    where: { userId },
    include: {
      tenant: {
        include: { preference: true },
      },
    },
  });
  return mapping?.tenant ?? null;
}

export async function getOperatorAccent(tenantId: string): Promise<string> {
  const pref = await prisma.tenantPreference.findUnique({ where: { tenantId } });
  return pref?.accentColour ?? DEFAULT_ACCENT;
}
