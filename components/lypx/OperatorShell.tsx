"use client";

import { useEffect, useState, useRef } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { applyAccent } from "@/lib/utils/theme";
import { AdminClock } from "./AdminClock";
import { WhatsAppInboxPanel } from "./WhatsAppInboxPanel";

const tabs = [
  { href: "/operator/dispatch",      label: "Dispatch Centre" },
  { href: "/operator/reservations",  label: "Reservations" },
  { href: "/operator/accounts",      label: "Accounts" },
  { href: "/operator/profiles",      label: "Profiles" },
  { href: "/operator/vehicles",      label: "Vehicles" },
  { href: "/operator/billing",       label: "Billing Logs" },
  { href: "/operator/gate-queue",    label: "Gate Queue" },
  { href: "/operator/settings",      label: "Settings" },
];

interface Props {
  tenantId: string;
  tenantName: string;
  userInitials: string;
  accent: string;
  logoUrl?: string | null;
  whatsappEnabled?: boolean;
  children: React.ReactNode;
}

export function OperatorShell({ tenantId, tenantName, userInitials, accent, logoUrl, whatsappEnabled, children }: Props) {
  const pathname = usePathname();
  const [showInbox, setShowInbox] = useState(false);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    applyAccent(accent);
  }, [accent]);

  // Poll unread count when WhatsApp is enabled
  useEffect(() => {
    if (!whatsappEnabled) return;
    let cancelled = false;
    async function fetchUnread() {
      const res = await fetch("/api/operator/whatsapp/unread").catch(() => null);
      if (res?.ok && !cancelled) {
        const { count } = await res.json();
        setUnread(count ?? 0);
      }
    }
    fetchUnread();
    const interval = setInterval(fetchUnread, 30_000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [whatsappEnabled]);

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", overflow: "hidden", background: "var(--bg)" }}>
      {/* Top bar */}
      <div className="lypx-topbar">
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          {logoUrl ? (
            <img src={logoUrl} alt={tenantName} style={{ height: 30, maxWidth: 120, objectFit: "contain" }} />
          ) : (
            <span className="brand-mark">LyPX</span>
          )}
          <div style={{ width: 1, height: 18, background: "var(--border)" }} />
          <span style={{ fontSize: 13, color: "var(--text-dim)", fontWeight: 500 }}>
            {tenantName}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <AdminClock />

          {/* WhatsApp icon — always visible; greyed + disabled when not enabled */}
          {whatsappEnabled ? (
            <button
              onClick={() => setShowInbox(p => !p)}
              style={{
                position: "relative", background: "none", border: "none", cursor: "pointer",
                padding: 4, color: showInbox ? "#25D366" : "#25D366",
                fontSize: 18, lineHeight: 1, display: "flex", alignItems: "center",
              }}
              title="WhatsApp Inbox"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2 22l4.985-1.406A9.956 9.956 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2zm0 18a7.963 7.963 0 01-4.065-1.112l-.291-.173-3.002.847.857-2.938-.19-.302A7.963 7.963 0 014 12c0-4.418 3.582-8 8-8s8 3.582 8 8-3.582 8-8 8zm4.406-5.845c-.24-.12-1.42-.7-1.64-.78-.22-.08-.38-.12-.54.12-.16.24-.62.78-.76.94-.14.16-.28.18-.52.06-.24-.12-1.013-.373-1.929-1.19-.713-.636-1.194-1.42-1.334-1.66-.14-.24-.015-.37.105-.49.108-.107.24-.28.36-.42.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.54-1.3-.74-1.78-.195-.468-.393-.404-.54-.412l-.46-.008c-.16 0-.42.06-.64.3-.22.24-.84.82-.84 2 0 1.18.86 2.32.98 2.48.12.16 1.693 2.587 4.1 3.627.573.247 1.02.395 1.37.505.576.183 1.1.157 1.514.095.462-.069 1.42-.58 1.62-1.14.2-.56.2-1.04.14-1.14-.06-.1-.22-.16-.46-.28z"/>
              </svg>
              {unread > 0 && (
                <span style={{
                  position: "absolute", top: 0, right: 0,
                  minWidth: 16, height: 16, borderRadius: 8,
                  background: "#25D366", color: "#fff",
                  fontSize: 9, fontWeight: 700, lineHeight: "16px",
                  textAlign: "center", padding: "0 3px",
                  border: "1.5px solid var(--bg)",
                }}>
                  {unread > 99 ? "99+" : unread}
                </span>
              )}
            </button>
          ) : (
            <button
              disabled
              style={{
                background: "none", border: "none", cursor: "not-allowed",
                padding: 4, color: "var(--text-faint)", opacity: 0.3,
                fontSize: 18, lineHeight: 1, display: "flex", alignItems: "center",
              }}
              title="WhatsApp not activated — contact LyPX to enable"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2 22l4.985-1.406A9.956 9.956 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2zm0 18a7.963 7.963 0 01-4.065-1.112l-.291-.173-3.002.847.857-2.938-.19-.302A7.963 7.963 0 014 12c0-4.418 3.582-8 8-8s8 3.582 8 8-3.582 8-8 8zm4.406-5.845c-.24-.12-1.42-.7-1.64-.78-.22-.08-.38-.12-.54.12-.16.24-.62.78-.76.94-.14.16-.28.18-.52.06-.24-.12-1.013-.373-1.929-1.19-.713-.636-1.194-1.42-1.334-1.66-.14-.24-.015-.37.105-.49.108-.107.24-.28.36-.42.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.54-1.3-.74-1.78-.195-.468-.393-.404-.54-.412l-.46-.008c-.16 0-.42.06-.64.3-.22.24-.84.82-.84 2 0 1.18.86 2.32.98 2.48.12.16 1.693 2.587 4.1 3.627.573.247 1.02.395 1.37.505.576.183 1.1.157 1.514.095.462-.069 1.42-.58 1.62-1.14.2-.56.2-1.04.14-1.14-.06-.1-.22-.16-.46-.28z"/>
              </svg>
            </button>
          )}

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

      {/* WhatsApp inbox panel */}
      {showInbox && whatsappEnabled && (
        <WhatsAppInboxPanel
          onClose={() => setShowInbox(false)}
          onUnreadChange={setUnread}
        />
      )}
    </div>
  );
}
