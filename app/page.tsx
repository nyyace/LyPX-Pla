import { withAuth } from "@workos-inc/authkit-nextjs";
import { redirect } from "next/navigation";
import { resolveUserRole } from "@/lib/utils/admin";
import { provisionOperatorUser } from "@/lib/utils/operator";

const ADMIN_ORG_ID = process.env.WORKOS_ADMIN_ORG_ID;

export default async function RootPage() {
  const { user, organizationId } = await withAuth();

  if (user) {
    let role = await resolveUserRole(user.id);

    // First-time operator login: WorkOS sets organizationId on the session when
    // a user authenticates via an org invitation. Create the TenantUser link now.
    if (role === "none" && organizationId && organizationId !== ADMIN_ORG_ID) {
      const provisioned = await provisionOperatorUser(user.id, organizationId);
      if (provisioned) role = "operator";
    }

    if (role === "operator") redirect("/operator/dispatch");
    if (role === "admin") redirect("/dispatch");
    redirect("/api/auth/signout");
  }

  redirect("/api/auth/signin");
}
