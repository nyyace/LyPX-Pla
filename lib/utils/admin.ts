import { workos } from "@/lib/workos/auth";
import { getOperatorTenant } from "./operator";

const ADMIN_ORG_ID = process.env.WORKOS_ADMIN_ORG_ID;

export async function isAdminUser(userId: string): Promise<boolean> {
  if (!ADMIN_ORG_ID) return false;
  try {
    const memberships = await workos.userManagement.listOrganizationMemberships({
      userId,
      organizationId: ADMIN_ORG_ID,
      limit: 1,
    });
    return memberships.data.some((m) => m.status === "active");
  } catch {
    return false;
  }
}

export async function resolveUserRole(userId: string): Promise<"admin" | "operator" | "none"> {
  const [tenant, admin] = await Promise.all([
    getOperatorTenant(userId),
    isAdminUser(userId),
  ]);
  if (tenant) return "operator";
  if (admin) return "admin";
  return "none";
}
