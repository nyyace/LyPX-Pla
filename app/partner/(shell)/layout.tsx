import { withAuth } from "@workos-inc/authkit-nextjs";
import { redirect } from "next/navigation";
import { getPartnerAccount } from "@/lib/utils/partner";
import { AppShell } from "@/components/lypx/AppShell";
import { PARTNER_TABS } from "@/lib/config/permissions";

export default async function PartnerLayout({ children }: { children: React.ReactNode }) {
  const { user } = await withAuth({ ensureSignedIn: true });
  if (!user) redirect("/");

  const account = await getPartnerAccount(user.id);

  if (!account) {
    return (
      <div style={{
        background: "var(--bg-primary)", height: "100vh",
        display: "flex", alignItems: "center", justifyContent: "center",
        flexDirection: "column", gap: 12,
      }}>
        <span className="brand-mark" style={{ fontSize: 24 }}>LyPX</span>
        <p style={{ color: "var(--text-dim)", fontSize: 14 }}>
          Your account is not linked to a partner account.
        </p>
        <p style={{ color: "var(--text-faint)", fontSize: 12 }}>
          Contact your LyPX account manager for access.
        </p>
      </div>
    );
  }

  const initials = [user.firstName?.[0], user.lastName?.[0]]
    .filter(Boolean)
    .join("")
    .toUpperCase() || "?";

  return (
    <AppShell
      role="partner"
      tenantId={account.id}
      userId={user.id}
      tabs={PARTNER_TABS}
      userDisplay={user.firstName ?? user.email ?? ""}
      userInitials={initials}
      accentColour="#E5A93C"
      tenantName={account.name}
    >
      {children}
    </AppShell>
  );
}
