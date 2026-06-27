import { withAuth } from "@workos-inc/authkit-nextjs";
import { redirect } from "next/navigation";
import { getOperatorTenant } from "@/lib/utils/operator";
import { isAdminUser } from "@/lib/utils/admin";
import { AppShell } from "@/components/lypx/AppShell";
import { ADMIN_TABS } from "@/lib/config/permissions";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user } = await withAuth({ ensureSignedIn: true });
  if (!user) redirect("/");

  const operatorTenant = await getOperatorTenant(user.id);
  if (operatorTenant) redirect("/operator/dispatch");

  const adminAccess = await isAdminUser(user.id);
  if (!adminAccess) redirect("/api/auth/signout");

  const initials = [user.firstName?.[0], user.lastName?.[0]]
    .filter(Boolean)
    .join("")
    .toUpperCase() || "?";

  return (
    <AppShell
      role="admin"
      tenantId="lypx_direct"
      tabs={ADMIN_TABS}
      userDisplay={user.firstName ?? user.email}
      userInitials={initials}
      accentColour="#E5A93C"
    >
      {children}
    </AppShell>
  );
}
