"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AddOperatorDrawer } from "./AddOperatorDrawer";
import { AddAdminDrawer } from "./AddAdminDrawer";
import { ViewOperatorDrawer } from "./ViewOperatorDrawer";

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
  preference: { timezone: string; whatsappEnabled?: boolean } | null;
  driverCount: number;
  userCount: number;
};

type AdminUser = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  emailVerified: boolean;
  createdAt: string | null;
  membershipStatus: string;
};

function statusPill(status: string) {
  const map: Record<string, { label: string; color: string }> = {
    active:    { label: "Active",    color: "#22c55e" },
    invited:   { label: "Invited",   color: "#f59e0b" },
    suspended: { label: "Suspended", color: "#ef4444" },
  };
  const s = map[status] ?? { label: status, color: "var(--text-dim)" };
  return (
    <span style={{ fontSize: 11, fontWeight: 600, color: s.color, border: `1px solid ${s.color}33`, padding: "2px 7px", borderRadius: 3, letterSpacing: "0.3px", textTransform: "uppercase" }}>
      {s.label}
    </span>
  );
}

export function UsersPageClient({
  operators,
  adminUsers,
  adminOrgConfigured,
}: {
  operators: Operator[];
  adminUsers: AdminUser[];
  adminOrgConfigured: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showAddOperator, setShowAddOperator] = useState(false);
  const [showAddAdmin, setShowAddAdmin] = useState(false);
  const [viewOperator, setViewOperator] = useState<Operator | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  function refresh() {
    startTransition(() => router.refresh());
  }

  async function handleSuspend(id: string) {
    setActionError(null);
    const res = await fetch(`/api/admin/operators/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "suspended" }),
    });
    if (!res.ok) {
      const d = await res.json();
      setActionError(d.error ?? "Failed to suspend operator");
      return;
    }
    setViewOperator(null);
    refresh();
  }

  async function handleReinstate(id: string) {
    setActionError(null);
    const res = await fetch(`/api/admin/operators/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "active" }),
    });
    if (!res.ok) {
      const d = await res.json();
      setActionError(d.error ?? "Failed to reinstate operator");
      return;
    }
    setViewOperator(null);
    refresh();
  }

  async function handleResendInvite(id: string) {
    setActionError(null);
    const res = await fetch(`/api/admin/operators/${id}/resend-invite`, { method: "POST" });
    if (!res.ok) {
      const d = await res.json();
      setActionError(d.error ?? "Failed to resend invite");
      return;
    }
    refresh();
  }

  async function handleRevokeInvite(id: string) {
    setActionError(null);
    const res = await fetch(`/api/admin/operators/${id}/revoke-invite`, { method: "POST" });
    if (!res.ok) {
      const d = await res.json();
      setActionError(d.error ?? "Failed to revoke invite");
      return;
    }
    refresh();
  }

  const colStyle: React.CSSProperties = { padding: "10px 12px", fontSize: 13, color: "var(--text)" };
  const thStyle: React.CSSProperties = { ...colStyle, color: "var(--text-faint)", fontWeight: 500, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.5px", borderBottom: "1px solid var(--border)" };

  return (
    <div style={{ padding: "32px 40px", maxWidth: 1200 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--text)", marginBottom: 32 }}>User Management</h1>

      {actionError && (
        <div style={{ background: "#ef444422", border: "1px solid #ef4444", borderRadius: 6, padding: "10px 14px", marginBottom: 20, color: "#ef4444", fontSize: 13 }}>
          {actionError}
        </div>
      )}

      {/* Operators section */}
      <div style={{ marginBottom: 48 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 600, color: "var(--text)", margin: 0 }}>Operators</h2>
            <p style={{ fontSize: 12, color: "var(--text-dim)", marginTop: 3, margin: 0 }}>
              Fleet operators using LyPX — {operators.length} total
            </p>
          </div>
          <button
            onClick={() => setShowAddOperator(true)}
            className="btn-primary"
            style={{ fontSize: 13, padding: "7px 16px" }}
          >
            + Invite Operator
          </button>
        </div>

        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={{ ...thStyle, textAlign: "left" }}>Company</th>
                <th style={{ ...thStyle, textAlign: "left" }}>Contact</th>
                <th style={{ ...thStyle, textAlign: "left" }}>Status</th>
                <th style={{ ...thStyle, textAlign: "right" }}>Drivers</th>
                <th style={{ ...thStyle, textAlign: "left" }}>Joined</th>
                <th style={{ ...thStyle, textAlign: "left" }}></th>
              </tr>
            </thead>
            <tbody>
              {operators.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ ...colStyle, textAlign: "center", color: "var(--text-faint)", padding: "32px 12px" }}>
                    No operators yet. Invite your first operator above.
                  </td>
                </tr>
              )}
              {operators.map((op, i) => (
                <tr key={op.id} style={{ borderTop: i === 0 ? undefined : "1px solid var(--border)" }}>
                  <td style={colStyle}>
                    <span style={{ fontWeight: 600 }}>{op.name}</span>
                    {op.marketplaceParticipation && (
                      <span style={{ marginLeft: 8, fontSize: 10, color: "var(--gold)", border: "1px solid var(--gold)44", padding: "1px 5px", borderRadius: 3 }}>MKT</span>
                    )}
                  </td>
                  <td style={colStyle}>
                    <div style={{ fontSize: 13 }}>{op.contactName ?? "—"}</div>
                    <div style={{ fontSize: 11, color: "var(--text-dim)" }}>{op.contactEmail ?? ""}</div>
                  </td>
                  <td style={colStyle}>{statusPill(op.status)}</td>
                  <td style={{ ...colStyle, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{op.driverCount}</td>
                  <td style={{ ...colStyle, color: "var(--text-dim)", fontSize: 12 }}>
                    {op.activatedAt
                      ? new Date(op.activatedAt).toLocaleDateString("en-SG", { day: "2-digit", month: "short", year: "numeric" })
                      : op.invitedAt
                        ? `Invited ${new Date(op.invitedAt).toLocaleDateString("en-SG", { day: "2-digit", month: "short" })}`
                        : new Date(op.createdAt).toLocaleDateString("en-SG", { day: "2-digit", month: "short", year: "numeric" })}
                  </td>
                  <td style={{ ...colStyle, textAlign: "right" }}>
                    <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                      {op.status === "invited" && (
                        <>
                          <button
                            onClick={() => handleResendInvite(op.id)}
                            disabled={isPending}
                            style={{ fontSize: 12, color: "var(--gold)", background: "none", border: "1px solid var(--gold)44", borderRadius: 4, padding: "4px 10px", cursor: "pointer" }}
                          >
                            Resend
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Revoke the invitation for ${op.name}? This cannot be undone.`)) {
                                handleRevokeInvite(op.id);
                              }
                            }}
                            disabled={isPending}
                            style={{ fontSize: 12, color: "#ef4444", background: "none", border: "1px solid #ef444444", borderRadius: 4, padding: "4px 10px", cursor: "pointer" }}
                          >
                            Revoke
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => setViewOperator(op)}
                        style={{ fontSize: 12, color: "var(--text-dim)", background: "none", border: "1px solid var(--border)", borderRadius: 4, padding: "4px 10px", cursor: "pointer" }}
                      >
                        View
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* LyPX Admin Users section */}
      <div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 600, color: "var(--text)", margin: 0 }}>LyPX Admin Users</h2>
            <p style={{ fontSize: 12, color: "var(--text-dim)", marginTop: 3, margin: 0 }}>
              Internal team members with Admin Console access
            </p>
          </div>
          <button
            onClick={() => setShowAddAdmin(true)}
            className="btn-primary"
            style={{ fontSize: 13, padding: "7px 16px" }}
            disabled={!adminOrgConfigured}
            title={!adminOrgConfigured ? "WORKOS_ADMIN_ORG_ID is not configured" : undefined}
          >
            + Invite Admin
          </button>
        </div>

        {!adminOrgConfigured && (
          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, padding: "20px 24px", color: "var(--text-dim)", fontSize: 13 }}>
            Set <code style={{ fontFamily: "monospace", color: "var(--gold)" }}>WORKOS_ADMIN_ORG_ID</code> in Railway env vars to enable admin user management.
          </div>
        )}

        {adminOrgConfigured && (
          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={{ ...thStyle, textAlign: "left" }}>Name</th>
                  <th style={{ ...thStyle, textAlign: "left" }}>Email</th>
                  <th style={{ ...thStyle, textAlign: "left" }}>Status</th>
                  <th style={{ ...thStyle, textAlign: "left" }}>Joined</th>
                </tr>
              </thead>
              <tbody>
                {adminUsers.length === 0 && (
                  <tr>
                    <td colSpan={4} style={{ ...colStyle, textAlign: "center", color: "var(--text-faint)", padding: "32px 12px" }}>
                      No admin users found.
                    </td>
                  </tr>
                )}
                {adminUsers.map((u, i) => (
                  <tr key={u.id} style={{ borderTop: i === 0 ? undefined : "1px solid var(--border)" }}>
                    <td style={colStyle}>
                      {u.firstName || u.lastName
                        ? `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim()
                        : "—"}
                    </td>
                    <td style={{ ...colStyle, color: "var(--text-dim)", fontFamily: "monospace", fontSize: 12 }}>{u.email}</td>
                    <td style={colStyle}>{statusPill(u.membershipStatus)}</td>
                    <td style={{ ...colStyle, color: "var(--text-dim)", fontSize: 12 }}>
                      {u.createdAt ? new Date(u.createdAt).toLocaleDateString("en-SG", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Drawers */}
      {showAddOperator && (
        <AddOperatorDrawer
          onClose={() => setShowAddOperator(false)}
          onSuccess={() => { setShowAddOperator(false); refresh(); }}
        />
      )}
      {showAddAdmin && (
        <AddAdminDrawer
          onClose={() => setShowAddAdmin(false)}
          onSuccess={() => { setShowAddAdmin(false); refresh(); }}
        />
      )}
      {viewOperator && (
        <ViewOperatorDrawer
          operator={viewOperator}
          onClose={() => setViewOperator(null)}
          onSuspend={handleSuspend}
          onReinstate={handleReinstate}
          isPending={isPending}
        />
      )}
    </div>
  );
}
