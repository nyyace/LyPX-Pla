import { withAuth } from "@workos-inc/authkit-nextjs";
import { redirect } from "next/navigation";
import { getOperatorTenant } from "@/lib/utils/operator";
import { isAdminUser } from "@/lib/utils/admin";
import { AppShell } from "@/components/lypx/AppShell";
import { ADMIN_TABS } from "@/lib/config/permissions";
import { ADMIN_NAV_VERSION } from "@/lib/config/adminNav";
import { AdminNavV2 } from "@/components/admin/AdminNavV2";
import { prisma } from "@/lib/prisma";

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

  let sidebarNav: React.ReactNode = undefined;
  if (ADMIN_NAV_VERSION === "v2") {
    const pendingComplianceCount = await prisma.complianceDocument.count({
      where: { status: "pending_review" },
    });
    sidebarNav = <AdminNavV2 pendingComplianceCount={pendingComplianceCount} />;
  }

  return (
    <AppShell
      role="admin"
      tenantId="lypx_direct"
      userId={user.id}
      tabs={ADMIN_TABS}
      userDisplay={user.firstName ?? user.email}
      userInitials={initials}
      accentColour="#E5A93C"
      sidebarNav={sidebarNav}
    >
      {children}
    </AppShell>
  );
}
