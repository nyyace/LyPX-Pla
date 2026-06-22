import { withAuth } from "@workos-inc/authkit-nextjs";
import { redirect } from "next/navigation";
import Link from "next/link";
import { AdminClock } from "@/components/lypx/AdminClock";

const tabs = [
  { href: "/dispatch",           label: "Dispatch Centre" },
  { href: "/compliance-queue",   label: "Compliance Queue" },
  { href: "/accounts",           label: "Accounts & Claims" },
  { href: "/takeover-requests",  label: "Takeover Requests" },
  { href: "/orders",             label: "Orders" },
  { href: "/whatsapp",           label: "WhatsApp" },
  { href: "/audit-log",          label: "Audit Log" },
  { href: "/settings",           label: "Settings" },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = await withAuth({ ensureSignedIn: true });
  if (!user) redirect("/");

  const initials = [user.firstName?.[0], user.lastName?.[0]]
    .filter(Boolean)
    .join("")
    .toUpperCase() || "?";

  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ background: "var(--bg)" }}>
      {/* Top bar */}
      <div className="lypx-topbar">
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <span className="brand-mark">LyPX</span>
          <div style={{ width: 1, height: 18, background: "var(--border)" }} />
          <span style={{ fontSize: 13, color: "var(--text-dim)", fontWeight: 500, letterSpacing: "0.2px" }}>
            Admin Console
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", lineHeight: 1.1 }}>
            <span className="mono" style={{ fontSize: 14, fontWeight: 600, color: "var(--text)" }}>
              {user.firstName ?? user.email}
            </span>
            <span style={{ fontSize: 10, color: "var(--text-faint)", textTransform: "uppercase", letterSpacing: "0.6px" }}>
              Admin
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 11, color: "var(--text-dim)", border: "1px solid var(--border)", padding: "5px 10px", borderRadius: 4 }}>
            <span className="live-dot" />
            <span className="mono">Admin · Live</span>
          </div>
          <AdminClock />
          <div style={{ width: 30, height: 30, borderRadius: 4, background: "var(--surface-raised)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "var(--gold)" }}>
            {initials}
          </div>
          <form action="/api/auth/signout" method="POST">
            <button type="submit" style={{ fontSize: 11, color: "var(--text-faint)", cursor: "pointer", background: "none", border: "none", padding: "4px 8px", borderRadius: 4 }}
              onMouseOver={(e) => (e.currentTarget.style.color = "var(--text)")}
              onMouseOut={(e) => (e.currentTarget.style.color = "var(--text-faint)")}>
              Sign out
            </button>
          </form>
        </div>
      </div>

      {/* Nav tabs */}
      <nav className="lypx-navtabs">
        {tabs.map((t) => (
          <AdminTab key={t.href} href={t.href} label={t.label} />
        ))}
      </nav>

      {/* Content */}
      <main className="flex-1 overflow-y-auto" style={{ background: "var(--bg)" }}>
        {children}
      </main>
    </div>
  );
}

// Client component for active-tab detection
import { AdminTab } from "@/components/lypx/AdminTab";
