"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { applyAccent } from "@/lib/utils/theme";
import { AdminClock } from "./AdminClock";

const tabs = [
  { href: "/operator/dispatch",      label: "Dispatch Centre" },
  { href: "/operator/reservations",  label: "Reservations" },
  { href: "/operator/profiles",      label: "Profiles" },
  { href: "/operator/billing",       label: "Billing Logs" },
  { href: "/operator/gate-queue",    label: "Gate Queue" },
  { href: "/operator/settings",      label: "Settings" },
];

interface Props {
  tenantId: string;
  tenantName: string;
  userInitials: string;
  accent: string;
  children: React.ReactNode;
}

export function OperatorShell({ tenantId, tenantName, userInitials, accent, children }: Props) {
  const pathname = usePathname();

  useEffect(() => {
    applyAccent(accent);
  }, [accent]);

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", overflow: "hidden", background: "var(--bg)" }}>
      {/* Top bar */}
      <div className="lypx-topbar">
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <span className="brand-mark">LyPX</span>
          <div style={{ width: 1, height: 18, background: "var(--border)" }} />
          <span style={{ fontSize: 13, color: "var(--text-dim)", fontWeight: 500 }}>
            {tenantName}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <AdminClock />
          <div style={{
            width: 30, height: 30, borderRadius: 4, background: "var(--surface-raised)",
            border: "1px solid var(--border)", display: "flex", alignItems: "center",
            justifyContent: "center", fontSize: 11, fontWeight: 700, color: "var(--accent)",
          }}>
            {userInitials}
          </div>
          <form action="/api/auth/signout" method="POST">
            <button type="submit" style={{
              fontSize: 11, color: "var(--text-faint)", cursor: "pointer",
              background: "none", border: "none", padding: "4px 8px", borderRadius: 4,
            }}>Sign out</button>
          </form>
        </div>
      </div>

      {/* Nav tabs */}
      <nav className="lypx-navtabs">
        {tabs.map(t => (
          <Link
            key={t.href}
            href={t.href}
            className={`lypx-tab${pathname === t.href || pathname.startsWith(t.href + "/") ? " active" : ""}`}
          >
            {t.label}
          </Link>
        ))}
      </nav>

      {/* Content */}
      <main style={{ flex: 1, overflowY: "auto", background: "var(--bg)" }}>
        {children}
      </main>
    </div>
  );
}
