"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { applyTheme, getStoredTheme } from "@/lib/utils/theme";
import { applyFontSize, getStoredFontSize } from "@/lib/utils/fontSize";
import { AdminClock } from "./AdminClock";
import { SignOutButton } from "./SignOutButton";
import { WhatsAppInboxPanel } from "./WhatsAppInboxPanel";
import type { TabDef } from "@/lib/config/permissions";

interface Props {
  role: "admin" | "operator";
  tenantId: string;
  userId: string;
  tabs: TabDef[];
  userDisplay: string;
  userInitials: string;
  accentColour: string;
  tenantName?: string;
  logoUrl?: string | null;
  whatsappEnabled?: boolean;
  children: React.ReactNode;
}

export function AppShell({
  role,
  tenantId,
  userId,
  tabs,
  userDisplay,
  userInitials,
  accentColour,
  tenantName,
  logoUrl,
  whatsappEnabled,
  children,
}: Props) {
  const pathname = usePathname();
  const [showInbox, setShowInbox] = useState(false);
  const [unread, setUnread] = useState(0);
  const [gateCount, setGateCount] = useState(0);

  // Apply stored theme + font size on mount
  useEffect(() => {
    const stored = getStoredTheme(tenantId);
    applyTheme(stored?.bg ?? "dark", stored?.accent ?? accentColour);
    applyFontSize(getStoredFontSize(userId));
  }, [tenantId, userId, accentColour]);

  // Gate queue badge — only active when a tab declares it
  const hasGateBadge = tabs.some(t => t.badge === "gate-queue");
  useEffect(() => {
    if (!hasGateBadge) return;
    let cancelled = false;
    async function poll() {
      const res = await fetch("/api/operator/gate-queue/count").catch(() => null);
      if (res?.ok && !cancelled) setGateCount((await res.json()).count ?? 0);
    }
    poll();
    const id = setInterval(poll, 60_000);
    return () => { cancelled = true; clearInterval(id); };
  }, [hasGateBadge]);

  // WhatsApp unread badge
  useEffect(() => {
    if (!whatsappEnabled) return;
    let cancelled = false;
    async function poll() {
      const res = await fetch("/api/operator/whatsapp/unread").catch(() => null);
      if (res?.ok && !cancelled) setUnread((await res.json()).count ?? 0);
    }
    poll();
    const id = setInterval(poll, 30_000);
    return () => { cancelled = true; clearInterval(id); };
  }, [whatsappEnabled]);

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", overflow: "hidden", background: "var(--bg-primary)" }}>

      {/* ── Top bar ── */}
      <div className="lypx-topbar">
        {/* Left: branding + context label */}
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          {role === "operator" && logoUrl ? (
            <img src={logoUrl} alt={tenantName} style={{ height: 30, maxWidth: 120, objectFit: "contain" }} />
          ) : (
            <span className="brand-mark">LyPX</span>
          )}
          <div style={{ width: 1, height: 18, background: "var(--border)" }} />
          <span style={{ fontSize: 13, color: "var(--text-dim)", fontWeight: 500, letterSpacing: "0.2px" }}>
            {role === "admin" ? "Admin Console" : tenantName}
          </span>
        </div>

        {/* Right: role-aware actions */}
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          {role === "admin" && (
            <>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", lineHeight: 1.1 }}>
                <span className="mono" style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>
                  {userDisplay}
                </span>
                <span style={{ fontSize: 10, color: "var(--text-faint)", textTransform: "uppercase", letterSpacing: "0.6px" }}>
                  Admin
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 11, color: "var(--text-dim)", border: "1px solid var(--border)", padding: "5px 10px", borderRadius: 4 }}>
                <span className="live-dot" />
                <span className="mono">Admin · Live</span>
              </div>
            </>
          )}

          <AdminClock />

          {role === "operator" && (
            whatsappEnabled ? (
              <button
                onClick={() => setShowInbox(p => !p)}
                title="WhatsApp Inbox"
                style={{
                  position: "relative", background: "none", border: "none",
                  cursor: "pointer", padding: 4, color: "#25D366",
                  fontSize: 18, lineHeight: 1, display: "flex", alignItems: "center",
                }}
              >
                <WhatsAppSvg />
                {unread > 0 && (
                  <span style={{
                    position: "absolute", top: 0, right: 0,
                    minWidth: 16, height: 16, borderRadius: 8,
                    background: "#25D366", color: "#fff",
                    fontSize: 9, fontWeight: 700, lineHeight: "16px",
                    textAlign: "center", padding: "0 3px",
                    border: "1.5px solid var(--bg-primary)",
                  }}>
                    {unread > 99 ? "99+" : unread}
                  </span>
                )}
              </button>
            ) : (
              <button
                disabled
                title="WhatsApp not activated — contact LyPX to enable"
                style={{
                  background: "none", border: "none", cursor: "not-allowed",
                  padding: 4, color: "var(--text-faint)", opacity: 0.3,
                  fontSize: 18, lineHeight: 1, display: "flex", alignItems: "center",
                }}
              >
                <WhatsAppSvg />
              </button>
            )
          )}

          <div style={{
            width: 30, height: 30, borderRadius: 4,
            background: "var(--surface-raised)", border: "1px solid var(--border)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 11, fontWeight: 700,
            color: role === "admin" ? "var(--gold)" : "var(--accent-color)",
          }}>
            {userInitials}
          </div>

          <SignOutButton />
        </div>
      </div>

      {/* ── Nav tabs ── */}
      <nav className="lypx-navtabs">
        {tabs.map(t => {
          const active = pathname === t.href || pathname.startsWith(t.href + "/");
          return (
            <Link
              key={t.href}
              href={t.href}
              className={`lypx-tab${active ? " active" : ""}`}
              style={{ display: "flex", alignItems: "center", gap: 6 }}
            >
              {t.label}
              {t.badge === "gate-queue" && gateCount > 0 && (
                <span style={{
                  background: "var(--red)", color: "#fff",
                  fontSize: 10, fontWeight: 700, lineHeight: 1,
                  padding: "2px 5px", borderRadius: 20,
                  minWidth: 18, textAlign: "center",
                }}>
                  {gateCount > 99 ? "99+" : gateCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* ── Content ── */}
      <main style={{ flex: 1, overflowY: "auto", background: "var(--bg-primary)" }}>
        {children}
      </main>

      {role === "operator" && showInbox && whatsappEnabled && (
        <WhatsAppInboxPanel
          onClose={() => setShowInbox(false)}
          onUnreadChange={setUnread}
        />
      )}
    </div>
  );
}

function WhatsAppSvg() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2 22l4.985-1.406A9.956 9.956 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2zm0 18a7.963 7.963 0 01-4.065-1.112l-.291-.173-3.002.847.857-2.938-.19-.302A7.963 7.963 0 014 12c0-4.418 3.582-8 8-8s8 3.582 8 8-3.582 8-8 8zm4.406-5.845c-.24-.12-1.42-.7-1.64-.78-.22-.08-.38-.12-.54.12-.16.24-.62.78-.76.94-.14.16-.28.18-.52.06-.24-.12-1.013-.373-1.929-1.19-.713-.636-1.194-1.42-1.334-1.66-.14-.24-.015-.37.105-.49.108-.107.24-.28.36-.42.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.54-1.3-.74-1.78-.195-.468-.393-.404-.54-.412l-.46-.008c-.16 0-.42.06-.64.3-.22.24-.84.82-.84 2 0 1.18.86 2.32.98 2.48.12.16 1.693 2.587 4.1 3.627.573.247 1.02.395 1.37.505.576.183 1.1.157 1.514.095.462-.069 1.42-.58 1.62-1.14.2-.56.2-1.04.14-1.14-.06-.1-.22-.16-.46-.28z" />
    </svg>
  );
}
