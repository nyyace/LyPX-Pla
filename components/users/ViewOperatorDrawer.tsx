"use client";

import { useState } from "react";

type Operator = {
  id: string;
  name: string;
  status: string;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  marketplaceParticipation: boolean;
  workosOrganisationId: string | null;
  workosInvitationId: string | null;
  invitedAt: string | null;
  activatedAt: string | null;
  createdAt: string;
  preference: { timezone: string } | null;
  driverCount: number;
  userCount: number;
};

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ display: "flex", gap: 12, padding: "10px 0", borderBottom: "1px solid var(--border)" }}>
      <span style={{ width: 140, flexShrink: 0, fontSize: 12, color: "var(--text-faint)", fontWeight: 500 }}>{label}</span>
      <span style={{ fontSize: 13, color: "var(--text)", wordBreak: "break-all" }}>{value ?? "—"}</span>
    </div>
  );
}

function fmtDate(d: string | null) {
  if (!d) return null;
  return new Date(d).toLocaleDateString("en-SG", { day: "2-digit", month: "short", year: "numeric" });
}

export function ViewOperatorDrawer({
  operator,
  onClose,
  onSuspend,
  onReinstate,
  isPending,
}: {
  operator: Operator;
  onClose: () => void;
  onSuspend: (id: string) => Promise<void>;
  onReinstate: (id: string) => Promise<void>;
  isPending: boolean;
}) {
  const [confirming, setConfirming] = useState<"suspend" | "reinstate" | null>(null);

  const statusColors: Record<string, string> = {
    active: "#22c55e",
    invited: "#f59e0b",
    suspended: "#ef4444",
  };
  const statusColor = statusColors[operator.status] ?? "var(--text-dim)";

  return (
    <>
      <div
        onClick={onClose}
        style={{ position: "fixed", inset: 0, background: "#00000066", zIndex: 40 }}
      />

      <div style={{
        position: "fixed", top: 0, right: 0, bottom: 0, width: 460,
        background: "var(--surface)", borderLeft: "1px solid var(--border)",
        zIndex: 50, display: "flex", flexDirection: "column",
      }}>
        {/* Header */}
        <div style={{ padding: "24px 28px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: "var(--text)" }}>{operator.name}</h2>
            <span style={{ fontSize: 11, fontWeight: 600, color: statusColor, border: `1px solid ${statusColor}33`, padding: "2px 7px", borderRadius: 3, letterSpacing: "0.3px", textTransform: "uppercase", display: "inline-block", marginTop: 6 }}>
              {operator.status}
            </span>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--text-dim)", fontSize: 20, cursor: "pointer", lineHeight: 1 }}>×</button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: "auto", padding: "24px 28px" }}>
          <div style={{ marginBottom: 24 }}>
            <Row label="Contact Name" value={operator.contactName} />
            <Row label="Contact Email" value={operator.contactEmail} />
            <Row label="Contact Phone" value={operator.contactPhone} />
            <Row label="Timezone" value={operator.preference?.timezone ?? "Asia/Singapore"} />
            <Row label="Marketplace" value={operator.marketplaceParticipation ? "Enabled" : "Disabled"} />
          </div>

          <div style={{ marginBottom: 24 }}>
            <p style={{ fontSize: 11, color: "var(--text-faint)", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 4 }}>Activity</p>
            <Row label="Drivers registered" value={operator.driverCount} />
            <Row label="Users" value={operator.userCount} />
          </div>

          <div style={{ marginBottom: 24 }}>
            <p style={{ fontSize: 11, color: "var(--text-faint)", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 4 }}>Lifecycle</p>
            <Row label="Invited" value={fmtDate(operator.invitedAt)} />
            <Row label="Activated" value={fmtDate(operator.activatedAt)} />
            <Row label="Created" value={fmtDate(operator.createdAt)} />
          </div>

          {operator.workosOrganisationId && (
            <div>
              <p style={{ fontSize: 11, color: "var(--text-faint)", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 4 }}>WorkOS</p>
              <Row label="Org ID" value={<span style={{ fontFamily: "monospace", fontSize: 11 }}>{operator.workosOrganisationId}</span>} />
              {operator.workosInvitationId && (
                <Row label="Invitation ID" value={<span style={{ fontFamily: "monospace", fontSize: 11 }}>{operator.workosInvitationId}</span>} />
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        {operator.status !== "invited" && (
          <div style={{ padding: "20px 28px", borderTop: "1px solid var(--border)" }}>
            {!confirming && (
              <>
                {operator.status === "active" && (
                  <button
                    onClick={() => setConfirming("suspend")}
                    style={{ width: "100%", padding: "10px", background: "#ef444422", border: "1px solid #ef4444", borderRadius: 6, color: "#ef4444", fontSize: 13, fontWeight: 500, cursor: "pointer" }}
                  >
                    Suspend Operator
                  </button>
                )}
                {operator.status === "suspended" && (
                  <button
                    onClick={() => setConfirming("reinstate")}
                    style={{ width: "100%", padding: "10px", background: "#22c55e22", border: "1px solid #22c55e", borderRadius: 6, color: "#22c55e", fontSize: 13, fontWeight: 500, cursor: "pointer" }}
                  >
                    Reinstate Operator
                  </button>
                )}
              </>
            )}

            {confirming === "suspend" && (
              <div>
                <p style={{ fontSize: 13, color: "var(--text)", marginBottom: 12 }}>
                  Suspend <strong>{operator.name}</strong>? Their operators will lose access immediately.
                </p>
                <div style={{ display: "flex", gap: 10 }}>
                  <button
                    onClick={() => setConfirming(null)}
                    style={{ flex: 1, padding: "9px", background: "none", border: "1px solid var(--border)", borderRadius: 6, color: "var(--text-dim)", fontSize: 13, cursor: "pointer" }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={async () => { setConfirming(null); await onSuspend(operator.id); }}
                    disabled={isPending}
                    style={{ flex: 2, padding: "9px", background: "#ef4444", border: "none", borderRadius: 6, color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
                  >
                    Confirm Suspend
                  </button>
                </div>
              </div>
            )}

            {confirming === "reinstate" && (
              <div>
                <p style={{ fontSize: 13, color: "var(--text)", marginBottom: 12 }}>
                  Reinstate <strong>{operator.name}</strong>? Their users will regain access.
                </p>
                <div style={{ display: "flex", gap: 10 }}>
                  <button
                    onClick={() => setConfirming(null)}
                    style={{ flex: 1, padding: "9px", background: "none", border: "1px solid var(--border)", borderRadius: 6, color: "var(--text-dim)", fontSize: 13, cursor: "pointer" }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={async () => { setConfirming(null); await onReinstate(operator.id); }}
                    disabled={isPending}
                    style={{ flex: 2, padding: "9px", background: "#22c55e", border: "none", borderRadius: 6, color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
                  >
                    Confirm Reinstate
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
