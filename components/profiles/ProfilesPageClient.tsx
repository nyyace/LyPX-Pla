"use client";

import { useState, useEffect, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import { PhoneInput } from "@/components/ui/PhoneInput";

// ─── Types ────────────────────────────────────────────────────────────────────

export type DriverListItem = {
  id: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  complianceStatus: string;
  tier1Member: boolean;
  centralPoolEligible: boolean;
  vehicleClass: string | null;
  vehicle: { plateNumber: string; make: string; model: string; vehicleClass?: string | null } | null;
  vocationalLicenceExpiry: string | null;
  tripCount30d: number;
};

export type InviteRequestItem = {
  id: string;
  driverWhatsapp: string | null;
  driverName: string | null;
  status: string;
  createdAt: string;
  sentAt: string | null;
  expiresAt: string | null;
};

type DriverDetail = {
  id: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  complianceStatus: string;
  tier1Member: boolean;
  centralPoolEligible: boolean;
  addedAt: string;
  licenceNumber: string | null;
  vocationalLicenceNumber: string | null;
  vocationalLicenceExpiry: string | null;
  documents: { id: string; docType: string; status: string; expiryDate: string | null; issuedDate: string | null; referenceNumber?: string | null }[];
  vehicle: { id: string; plateNumber: string; make: string; model: string; vehicleClass: string | null } | null;
  recentOrders: { id: string; completedAt: string | null; pickupLocation: string; dropoffLocation: string; tripFare: number | null }[];
  tripCount30d: number;
  earningsThisMonth: number;
};

type CheckResult = {
  status: "found_active" | "found_suspended" | "found_pending" | "not_found";
  driver?: {
    firstName: string;
    lastName: string;
    centralPoolEligible: boolean;
  };
};

// ─── Chips & Colours ─────────────────────────────────────────────────────────

const STATUS_COLOUR: Record<string, string> = {
  active:        "#4CAF6D",
  expiring_soon: "#E5A93C",
  suspended:     "#D9534F",
  pending:       "var(--text-faint)",
};

function StatusDot({ status }: { status: string }) {
  return (
    <span style={{
      display: "inline-block", width: 7, height: 7, borderRadius: "50%",
      background: STATUS_COLOUR[status] ?? "var(--text-faint)",
      flexShrink: 0,
    }} />
  );
}

function TierChip({ tier1, tier3 }: { tier1: boolean; tier3: boolean }) {
  if (tier1) return (
    <span style={{ fontSize: 9, fontWeight: 700, padding: "1px 5px", borderRadius: 3, background: "#3d2f00", color: "#E5A93C", border: "1px solid #5a4500" }}>T1</span>
  );
  if (tier3) return (
    <span style={{ fontSize: 9, fontWeight: 700, padding: "1px 5px", borderRadius: 3, background: "#0d2e30", color: "#4eb8c9", border: "1px solid #1a4a55" }}>T3</span>
  );
  return null;
}

const CLASS_STYLE: Record<string, React.CSSProperties> = {
  VVV: { background: "#2d1a5a", color: "#c4b5fd", border: "1px solid #4B2D8F" },
  AVF: { background: "#0f2535", color: "#7FC8F8", border: "1px solid #1a3a5f" },
  NVE: { background: "#1a3d2b", color: "#4CAF6D", border: "1px solid #2d6b4a" },
};

function ClassChip({ cls }: { cls: string | null | undefined }) {
  if (!cls) return null;
  const style = CLASS_STYLE[cls] ?? { background: "var(--surface-raised)", color: "var(--text-faint)", border: "1px solid var(--border)" };
  return (
    <span style={{ fontSize: 9, fontWeight: 700, padding: "1px 5px", borderRadius: 3, ...style }}>{cls}</span>
  );
}

function DocChip({ expiryDate, status }: { expiryDate: string | null; status: string }) {
  if (status !== "verified") {
    if (status === "pending_review") return <span className="chip chip-blue">PENDING</span>;
    return <span className="chip chip-dim">{status.toUpperCase()}</span>;
  }
  if (!expiryDate) return <span className="chip chip-green">VERIFIED</span>;
  const daysLeft = Math.ceil((new Date(expiryDate).getTime() - Date.now()) / 86400000);
  if (daysLeft < 0) return <span className="chip chip-red">EXPIRED</span>;
  if (daysLeft <= 30) return <span className="chip chip-red">EXPIRING</span>;
  if (daysLeft <= 90) return <span className="chip chip-amber">EXPIRING</span>;
  return <span className="chip chip-green">VALID</span>;
}

function fmtDate(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-SG", { day: "2-digit", month: "short", year: "numeric" });
}

function fmtSGD(amount: number) {
  return `S$${amount.toFixed(2)}`;
}

function daysAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (diff === 0) return "today";
  if (diff === 1) return "1 day ago";
  return `${diff} days ago`;
}

function daysUntilLabel(iso: string | null): string | null {
  if (!iso) return null;
  const diff = Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000);
  if (diff <= 0) return "expired";
  return `expires ${diff}d`;
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface Props {
  initialDrivers: DriverListItem[];
  initialInviteRequests: InviteRequestItem[];
  timezone: string;
  tenantId: string;
}

export function ProfilesPageClient({ initialDrivers, initialInviteRequests, timezone, tenantId }: Props) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  const [drivers, setDrivers] = useState<DriverListItem[]>(initialDrivers);
  const [inviteRequests, setInviteRequests] = useState<InviteRequestItem[]>(initialInviteRequests);

  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(drivers[0]?.id ?? null);
  const [driverDetail, setDriverDetail] = useState<DriverDetail | null>(null);
  const [driverDetailLoading, setDriverDetailLoading] = useState(false);

  const [search, setSearch] = useState("");

  // Add Driver drawer state
  const [addDriverOpen, setAddDriverOpen] = useState(false);
  const [waInput, setWaInput] = useState("");
  const [checkResult, setCheckResult] = useState<CheckResult | null>(null);
  const [checking, setChecking] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [addingTier1, setAddingTier1] = useState(false);
  const [sendingInvite, setSendingInvite] = useState(false);
  const [inviteSuccess, setInviteSuccess] = useState(false);
  const [drawerError, setDrawerError] = useState<string | null>(null);
  const [tier1Mutating, setTier1Mutating] = useState(false);
  const [tier1Error, setTier1Error] = useState<string | null>(null);

  const [confirmingCancelId, setConfirmingCancelId] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const waInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!selectedDriverId) { setDriverDetail(null); return; }
    setDriverDetailLoading(true);
    fetch(`/api/operator/profiles/drivers/${selectedDriverId}`)
      .then((r) => r.json())
      .then((d) => { setDriverDetail(d); setDriverDetailLoading(false); })
      .catch(() => setDriverDetailLoading(false));
  }, [selectedDriverId]);

  useEffect(() => {
    if (addDriverOpen) {
      setWaInput("");
      setCheckResult(null);
      setNameInput("");
      setDrawerError(null);
      setInviteSuccess(false);
      setTimeout(() => waInputRef.current?.focus(), 50);
    }
  }, [addDriverOpen]);

  async function refreshDriverList() {
    const res = await fetch("/api/operator/profiles/drivers");
    if (res.ok) setDrivers(await res.json());
  }

  async function refreshInviteRequests() {
    const res = await fetch("/api/operator/drivers/invite-request");
    if (res.ok) setInviteRequests(await res.json());
  }

  async function handleCheckWhatsapp(e: React.FormEvent) {
    e.preventDefault();
    if (!waInput) return;
    setChecking(true);
    setCheckResult(null);
    setDrawerError(null);
    const res = await fetch(`/api/operator/drivers/check-whatsapp?number=${encodeURIComponent(waInput.trim())}`);
    const data = await res.json();
    setCheckResult(data);
    setChecking(false);
  }

  async function handleAddTier1ByWa() {
    setAddingTier1(true);
    setDrawerError(null);
    const res = await fetch("/api/operator/drivers/add-by-whatsapp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ driverWhatsapp: waInput.trim() }),
    });
    if (!res.ok) {
      const d = await res.json();
      setDrawerError(d.error ?? "Failed to add driver");
      setAddingTier1(false);
      return;
    }
    const data = await res.json();
    await refreshDriverList();
    setAddDriverOpen(false);
    setSelectedDriverId(data.driverId ?? null);
    setAddingTier1(false);
  }

  async function handleSendInvite(e: React.FormEvent) {
    e.preventDefault();
    setSendingInvite(true);
    setDrawerError(null);
    const res = await fetch("/api/operator/drivers/invite-request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        driverWhatsapp: waInput.trim(),
        driverName: nameInput.trim() || undefined,
      }),
    });
    const data = await res.json();
    setSendingInvite(false);
    if (!res.ok) {
      setDrawerError(data.error ?? "Failed to send invite request");
      return;
    }
    setInviteSuccess(true);
    await refreshInviteRequests();
  }

  async function handleCancelInvite(id: string) {
    setCancellingId(id);
    const res = await fetch(`/api/operator/drivers/invite-request/${id}`, { method: "DELETE" });
    setCancellingId(null);
    setConfirmingCancelId(null);
    if (res.ok) {
      setInviteRequests((prev) => prev.filter((r) => r.id !== id));
    }
  }

  async function handleRemoveTier1() {
    if (!selectedDriverId || !driverDetail?.tier1Member) return;
    setTier1Mutating(true);
    setTier1Error(null);
    const res = await fetch(`/api/operator/profiles/drivers/${selectedDriverId}/remove-tier1`, { method: "DELETE" });
    if (!res.ok) {
      const d = await res.json();
      setTier1Error(d.error ?? "Failed");
      setTier1Mutating(false);
      return;
    }
    await refreshDriverList();
    const dr = await fetch(`/api/operator/profiles/drivers/${selectedDriverId}`).then((r) => r.json());
    setDriverDetail(dr);
    setTier1Mutating(false);
    startTransition(() => router.refresh());
  }

  const filteredDrivers = drivers.filter((d) => {
    const q = search.toLowerCase();
    return (
      d.firstName.toLowerCase().includes(q) ||
      d.lastName.toLowerCase().includes(q) ||
      (d.vehicle?.plateNumber ?? "").toLowerCase().includes(q)
    );
  });

  const leftPanelStyle: React.CSSProperties = {
    width: "25%", borderRight: "1px solid var(--border)", overflowY: "auto", height: "100%",
    display: "flex", flexDirection: "column",
  };
  const rightPanelStyle: React.CSSProperties = {
    flex: 1, overflowY: "auto", height: "100%",
  };

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      {/* 25/75 split — no sub-tabs */}
      <div style={{ flex: 1, display: "grid", gridTemplateColumns: "25% 75%", overflow: "hidden" }}>
        {/* ── LEFT PANEL ─────────────────────────────────────────────────── */}
        <div style={leftPanelStyle}>
          <div style={{ padding: "12px 12px 8px", flexShrink: 0 }}>
            <input
              placeholder="Search drivers…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: "100%", background: "var(--surface-raised)", border: "1px solid var(--border)",
                borderRadius: 4, color: "var(--text)", fontSize: 12, padding: "6px 10px", outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>

          <div style={{ padding: "0 12px 8px", flexShrink: 0 }}>
            <button
              onClick={() => setAddDriverOpen(true)}
              style={{
                width: "100%", padding: "7px", fontSize: 12, fontWeight: 600,
                background: "var(--accent)", color: "#000", border: "none", borderRadius: 4, cursor: "pointer",
              }}
            >
              + Add Driver
            </button>
          </div>

          <div style={{ flex: 1, overflowY: "auto" }}>
            {filteredDrivers.map((d) => (
              <div
                key={d.id}
                onClick={() => setSelectedDriverId(d.id)}
                style={{
                  padding: "10px 12px", cursor: "pointer", borderBottom: "1px solid var(--border)",
                  background: selectedDriverId === d.id ? "var(--surface)" : "transparent",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                  <StatusDot status={d.complianceStatus} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", flex: 1 }}>
                    {d.firstName} {d.lastName}
                  </span>
                  <div style={{ display: "flex", gap: 3, alignItems: "center" }}>
                    <TierChip tier1={d.tier1Member} tier3={d.centralPoolEligible} />
                    <ClassChip cls={d.vehicleClass} />
                  </div>
                </div>
                {d.vehicle && (
                  <p className="mono" style={{ fontSize: 11, color: "var(--text-faint)", margin: 0, paddingLeft: 13 }}>
                    {d.vehicle.plateNumber}
                    {d.tripCount30d > 0 && (
                      <span style={{ marginLeft: 6, color: "var(--text-faint)" }}>· {d.tripCount30d} trips</span>
                    )}
                  </p>
                )}
              </div>
            ))}

            {filteredDrivers.length === 0 && (
              <p style={{ padding: "32px 16px", textAlign: "center", fontSize: 12, color: "var(--text-faint)" }}>
                {drivers.length === 0 ? "No drivers yet" : "No results"}
              </p>
            )}

            {/* Pending Invitations */}
            {inviteRequests.length > 0 && (
              <div style={{ borderTop: "1px solid var(--border)", marginTop: 8 }}>
                <div style={{ padding: "10px 12px 6px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <p style={{ fontSize: 10, fontWeight: 600, color: "var(--text-faint)", textTransform: "uppercase", letterSpacing: "0.5px", margin: 0 }}>
                    Pending Invitations
                  </p>
                  <span style={{ fontSize: 10, background: "var(--surface-raised)", border: "1px solid var(--border)", borderRadius: 10, padding: "1px 6px", color: "var(--text-faint)" }}>
                    {inviteRequests.length}
                  </span>
                </div>
                {inviteRequests.map((r) => (
                  <div key={r.id} style={{ padding: "8px 12px", borderBottom: "1px solid var(--border)" }}>
                    {confirmingCancelId === r.id ? (
                      /* Inline confirmation */
                      <div>
                        <p style={{ fontSize: 11, color: "var(--text-dim)", margin: "0 0 8px" }}>
                          Cancel this invite?
                        </p>
                        <div style={{ display: "flex", gap: 6 }}>
                          <button
                            onClick={() => handleCancelInvite(r.id)}
                            disabled={cancellingId === r.id}
                            style={{
                              fontSize: 11, fontWeight: 600, padding: "4px 10px",
                              background: "var(--red)", color: "#fff", border: "none",
                              borderRadius: 4, cursor: "pointer",
                              opacity: cancellingId === r.id ? 0.6 : 1,
                            }}
                          >
                            {cancellingId === r.id ? "Cancelling…" : "Yes, cancel"}
                          </button>
                          <button
                            onClick={() => setConfirmingCancelId(null)}
                            style={{
                              fontSize: 11, padding: "4px 10px",
                              background: "none", color: "var(--text-dim)",
                              border: "1px solid var(--border)", borderRadius: 4, cursor: "pointer",
                            }}
                          >
                            Keep
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* Normal row */
                      <>
                        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                          <div className="mono" style={{ fontSize: 12, color: "var(--text)" }}>
                            {r.driverWhatsapp}
                          </div>
                          <button
                            onClick={() => setConfirmingCancelId(r.id)}
                            style={{
                              fontSize: 10, color: "var(--text-dim)", background: "none",
                              border: "none", cursor: "pointer", padding: "0 2px", lineHeight: 1,
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.color = "var(--red)")}
                            onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-dim)")}
                            title="Cancel invite"
                          >
                            ✕
                          </button>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 2 }}>
                          <span style={{ fontSize: 11, color: "var(--text-faint)" }}>
                            {r.driverName ?? "—"}
                          </span>
                          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                            <span style={{
                              fontSize: 9, fontWeight: 600, textTransform: "uppercase",
                              padding: "1px 5px", borderRadius: 3,
                              background: r.status === "sent" ? "#1a3d2b" : "#3d2f00",
                              color: r.status === "sent" ? "#4CAF6D" : "#E5A93C",
                              border: `1px solid ${r.status === "sent" ? "#2d6b4a" : "#5a4500"}`,
                            }}>
                              {r.status}
                            </span>
                            {r.expiresAt && (
                              <span style={{ fontSize: 9, color: "var(--text-faint)" }}>
                                {daysUntilLabel(r.expiresAt)}
                              </span>
                            )}
                          </div>
                        </div>
                        <p style={{ fontSize: 10, color: "var(--text-faint)", margin: "2px 0 0" }}>
                          {daysAgo(r.createdAt)}
                        </p>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── RIGHT PANEL ────────────────────────────────────────────────── */}
        <div style={rightPanelStyle}>
          {driverDetailLoading ? (
            <div style={{ padding: 32, color: "var(--text-faint)", fontSize: 13 }}>Loading…</div>
          ) : driverDetail ? (
            <DriverDetailView
              detail={driverDetail}
              onRemoveTier1={handleRemoveTier1}
              removing={tier1Mutating}
              removeError={tier1Error}
              timezone={timezone}
            />
          ) : (
            <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-faint)", fontSize: 13 }}>
              Select a driver
            </div>
          )}
        </div>
      </div>

      {/* ── Add Driver Drawer ───────────────────────────────────────────────── */}
      {addDriverOpen && (
        <>
          <div onClick={() => setAddDriverOpen(false)} style={{ position: "fixed", inset: 0, background: "#00000066", zIndex: 40 }} />
          <div style={{
            position: "fixed", top: 0, right: 0, bottom: 0, width: 440,
            background: "var(--surface)", borderLeft: "1px solid var(--border)",
            zIndex: 50, display: "flex", flexDirection: "column",
          }}>
            <div style={{ padding: "24px 24px 16px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: "var(--text)" }}>Add Driver</h2>
                <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--text-dim)" }}>
                  Search by WhatsApp number
                </p>
              </div>
              <button onClick={() => setAddDriverOpen(false)} style={{ background: "none", border: "none", color: "var(--text-dim)", fontSize: 22, cursor: "pointer", lineHeight: 1 }}>×</button>
            </div>

            <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 20, flex: 1, overflowY: "auto" }}>

              {/* WhatsApp number input */}
              <div>
                <label style={{ fontSize: 12, color: "var(--text-dim)", fontWeight: 500, marginBottom: 6, display: "block" }}>
                  Driver&apos;s WhatsApp Number <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <form onSubmit={handleCheckWhatsapp} style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
                  <div style={{ flex: 1 }}>
                    <PhoneInput
                      value={waInput}
                      onChange={(e164) => { setWaInput(e164); setCheckResult(null); setDrawerError(null); setInviteSuccess(false); }}
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={!waInput || checking}
                    style={{
                      padding: "9px 16px", fontSize: 13, fontWeight: 600, background: "var(--accent)",
                      color: "#000", border: "none", borderRadius: 4, cursor: "pointer", flexShrink: 0,
                      opacity: (!waInput || checking) ? 0.5 : 1,
                    }}
                  >
                    {checking ? "Checking…" : "Check Number →"}
                  </button>
                </form>
                <p style={{ fontSize: 11, color: "var(--text-faint)", marginTop: 6 }}>
                  We will check if this driver is already on LyPX.
                </p>
              </div>

              {drawerError && (
                <p style={{ fontSize: 13, color: "#D9534F" }}>{drawerError}</p>
              )}

              {/* Result A — found active */}
              {checkResult?.status === "found_active" && checkResult.driver && (
                <div style={{ background: "var(--surface-raised)", border: "1px solid #22c55e44", borderRadius: 8, padding: 16 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                    <span style={{ color: "#4CAF6D", fontSize: 14 }}>✓</span>
                    <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text)" }}>
                      {checkResult.driver.firstName} {checkResult.driver.lastName} is already verified on LyPX.
                    </span>
                  </div>
                  {checkResult.driver.centralPoolEligible && (
                    <div style={{ marginBottom: 10 }}>
                      <TierChip tier1={false} tier3={true} />
                      <span style={{ fontSize: 12, color: "var(--text-dim)", marginLeft: 6 }}>LyPX Central Pool eligible</span>
                    </div>
                  )}
                  <button
                    onClick={handleAddTier1ByWa}
                    disabled={addingTier1}
                    className="btn-primary"
                    style={{ fontSize: 13, padding: "9px 18px" }}
                  >
                    {addingTier1 ? "Adding…" : "Add to My Tier 1 Fleet"}
                  </button>
                </div>
              )}

              {/* Result — found suspended */}
              {checkResult?.status === "found_suspended" && (
                <div style={{ background: "var(--surface-raised)", border: "1px solid #D9534F44", borderRadius: 8, padding: 16 }}>
                  <p style={{ fontSize: 13, color: "#D9534F", fontWeight: 500, margin: 0 }}>
                    This driver cannot be added — they are currently suspended on LyPX.
                  </p>
                </div>
              )}

              {/* Result — found pending */}
              {checkResult?.status === "found_pending" && (
                <div style={{ background: "var(--surface-raised)", border: "1px solid var(--border)", borderRadius: 8, padding: 16 }}>
                  <p style={{ fontSize: 13, color: "var(--text-dim)", margin: 0 }}>
                    This driver&apos;s profile is pending review. They can be added once approved by LyPX.
                  </p>
                </div>
              )}

              {/* Result B — not found → invite form */}
              {checkResult?.status === "not_found" && !inviteSuccess && (
                <div style={{ background: "var(--surface-raised)", border: "1px solid var(--border)", borderRadius: 8, padding: 16 }}>
                  <p style={{ fontSize: 13, color: "var(--text-dim)", marginBottom: 16 }}>
                    This driver is not yet registered on LyPX.
                  </p>
                  <form onSubmit={handleSendInvite} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    <div>
                      <label style={{ fontSize: 12, color: "var(--text-dim)", fontWeight: 500, marginBottom: 6, display: "block" }}>
                        Driver Name <span style={{ color: "var(--text-faint)" }}>(optional — helps admin identify)</span>
                      </label>
                      <input
                        value={nameInput}
                        onChange={(e) => setNameInput(e.target.value)}
                        placeholder="e.g. David Tan"
                        style={{
                          width: "100%", background: "var(--surface)", border: "1px solid var(--border)",
                          borderRadius: 4, color: "var(--text)", fontSize: 13, padding: "9px 12px", outline: "none",
                          boxSizing: "border-box",
                        }}
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={sendingInvite}
                      className="btn-primary"
                      style={{ fontSize: 13, padding: "9px 18px", alignSelf: "flex-start" }}
                    >
                      {sendingInvite ? "Sending…" : "Send Invite Request →"}
                    </button>
                  </form>
                </div>
              )}

              {/* Invite sent success */}
              {inviteSuccess && (
                <div style={{ background: "#22c55e11", border: "1px solid #22c55e44", borderRadius: 8, padding: 16 }}>
                  <p style={{ fontSize: 13, color: "#4CAF6D", fontWeight: 500, margin: 0 }}>
                    ✓ Request sent to LyPX for review.
                  </p>
                  <p style={{ fontSize: 12, color: "var(--text-dim)", marginTop: 6 }}>
                    LyPX will review and send an onboarding invite to the driver.
                  </p>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Driver Detail View ───────────────────────────────────────────────────────

function DriverDetailView({
  detail,
  onRemoveTier1,
  removing,
  removeError,
  timezone,
}: {
  detail: DriverDetail;
  onRemoveTier1: () => void;
  removing: boolean;
  removeError: string | null;
  timezone: string;
}) {
  const [confirmingRemove, setConfirmingRemove] = useState(false);
  const d = detail;
  const initials = (d.firstName[0] ?? "") + (d.lastName[0] ?? "");

  return (
    <div style={{ padding: 28 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 28 }}>
        <div style={{
          width: 48, height: 48, borderRadius: 8, background: "var(--surface-raised)",
          border: "1px solid var(--border)", display: "flex", alignItems: "center",
          justifyContent: "center", fontSize: 16, fontWeight: 700, color: "var(--accent)", flexShrink: 0,
        }}>
          {initials}
        </div>
        <div style={{ flex: 1 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--text)", margin: 0 }}>
            {d.firstName} {d.lastName}
          </h2>
          <p className="mono" style={{ fontSize: 12, color: "var(--text-faint)", margin: "3px 0 0" }}>
            {d.phoneNumber}
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 12, color: STATUS_COLOUR[d.complianceStatus], fontWeight: 600 }}>
            ● {d.complianceStatus.replace(/_/g, " ").toUpperCase()}
          </span>
          <TierChip tier1={d.tier1Member} tier3={d.centralPoolEligible} />
          <ClassChip cls={d.vehicle?.vehicleClass} />
        </div>
      </div>

      {/* Compliance Documents */}
      <p className="panel-title" style={{ marginBottom: 10 }}>Compliance Documents</p>
      <div style={{ marginBottom: 24 }}>
        {d.documents.length === 0 ? (
          <p style={{ fontSize: 12, color: "var(--text-faint)" }}>No documents on file</p>
        ) : d.documents.map((doc) => {
          const daysLeft = doc.expiryDate
            ? Math.ceil((new Date(doc.expiryDate).getTime() - Date.now()) / 86400000)
            : null;
          const subtitle = !doc.expiryDate
            ? (doc.docType === "driving_licence" && doc.issuedDate
                ? `Issued ${fmtDate(doc.issuedDate)}`
                : "No expiry required")
            : daysLeft !== null && daysLeft < 0
              ? `Expired ${Math.abs(daysLeft)} days ago`
              : `Expires ${fmtDate(doc.expiryDate)} · ${daysLeft}d`;
          return (
            <div key={doc.id} style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "10px 0", borderBottom: "1px solid var(--border)",
            }}>
              <div>
                <p style={{ fontSize: 13, color: "var(--text)", margin: 0, textTransform: "capitalize" }}>
                  {doc.docType.replace(/_/g, " ")}
                </p>
                <p style={{ fontSize: 11, color: "var(--text-faint)", margin: "3px 0 0" }}>{subtitle}</p>
              </div>
              <DocChip expiryDate={doc.expiryDate} status={doc.status} />
            </div>
          );
        })}
      </div>

      {/* Tier Membership */}
      <p className="panel-title" style={{ marginBottom: 10 }}>Tier Membership</p>
      <div style={{ marginBottom: 24, display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <TierChip tier1={true} tier3={false} />
            <span style={{ fontSize: 13, color: d.tier1Member ? "var(--text)" : "var(--text-faint)" }}>
              {d.tier1Member ? "Tier 1 — This operator" : "Not a Tier 1 member"}
            </span>
          </div>
          {d.tier1Member && (
            <button
              onClick={() => setConfirmingRemove(true)}
              disabled={removing}
              style={{
                fontSize: 11, color: "#D9534F", background: "none",
                border: "1px solid #D9534F44", borderRadius: 4, padding: "3px 10px", cursor: "pointer",
              }}
            >
              {removing ? "Removing…" : "Remove T1"}
            </button>
          )}
        </div>
        {d.centralPoolEligible && (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <TierChip tier1={false} tier3={true} />
            <span style={{ fontSize: 13, color: "var(--text)" }}>Tier 3 — LyPX Platform (Central Pool)</span>
          </div>
        )}
        {removeError && <p style={{ fontSize: 12, color: "#D9534F" }}>{removeError}</p>}
      </div>

      {/* Confirmation modal */}
      {confirmingRemove && (
        <>
          <div onClick={() => setConfirmingRemove(false)} style={{ position: "fixed", inset: 0, background: "#00000066", zIndex: 60 }} />
          <div style={{
            position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)",
            background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10,
            padding: "28px 32px", width: 400, zIndex: 70,
          }}>
            <p style={{ fontSize: 15, fontWeight: 600, color: "var(--text)", margin: "0 0 12px" }}>
              Remove {d.firstName} {d.lastName} from your Tier 1 fleet?
            </p>
            <p style={{ fontSize: 13, color: "var(--text-dim)", lineHeight: 1.6, margin: "0 0 24px" }}>
              They will remain on the LyPX platform and may be available through the general driver pool.
            </p>
            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={() => setConfirmingRemove(false)}
                style={{ flex: 1, padding: "9px", background: "none", border: "1px solid var(--border)", borderRadius: 6, color: "var(--text-dim)", fontSize: 13, cursor: "pointer" }}
              >
                Cancel
              </button>
              <button
                onClick={() => { setConfirmingRemove(false); onRemoveTier1(); }}
                disabled={removing}
                style={{ flex: 2, padding: "9px", background: "#D9534F", border: "none", borderRadius: 6, color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
              >
                Remove from Tier 1
              </button>
            </div>
          </div>
        </>
      )}

      {/* Vehicle */}
      {d.vehicle && (
        <>
          <p className="panel-title" style={{ marginBottom: 10 }}>Vehicle</p>
          <div style={{ marginBottom: 24, padding: "12px 14px", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 6 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <p className="mono" style={{ fontSize: 14, fontWeight: 600, color: "var(--text)", margin: 0 }}>
                  {d.vehicle.plateNumber}
                </p>
                <p style={{ fontSize: 12, color: "var(--text-faint)", margin: "3px 0 0" }}>
                  {d.vehicle.make} {d.vehicle.model}
                </p>
              </div>
              <ClassChip cls={d.vehicle.vehicleClass} />
            </div>
          </div>
        </>
      )}

      {/* Trip Stats */}
      <p className="panel-title" style={{ marginBottom: 10 }}>Performance</p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 24 }}>
        <div style={{ padding: "12px 14px", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 6 }}>
          <p style={{ fontSize: 11, color: "var(--text-faint)", margin: "0 0 4px", textTransform: "uppercase", letterSpacing: "0.4px" }}>Trips (30d)</p>
          <p style={{ fontSize: 20, fontWeight: 700, color: "var(--text)", margin: 0 }}>{d.tripCount30d}</p>
        </div>
        <div style={{ padding: "12px 14px", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 6 }}>
          <p style={{ fontSize: 11, color: "var(--text-faint)", margin: "0 0 4px", textTransform: "uppercase", letterSpacing: "0.4px" }}>Revenue (this month)</p>
          <p style={{ fontSize: 20, fontWeight: 700, color: "var(--text)", margin: 0 }}>
            {fmtSGD(d.earningsThisMonth)}
          </p>
        </div>
      </div>

      {d.recentOrders.length > 0 && (
        <>
          <p className="panel-title" style={{ marginBottom: 10 }}>Recent Trips (30d)</p>
          <div>
            {d.recentOrders.slice(0, 8).map((o) => (
              <div key={o.id} style={{
                padding: "9px 0", borderBottom: "1px solid var(--border)",
                display: "flex", alignItems: "flex-start", justifyContent: "space-between",
              }}>
                <div>
                  <p style={{ fontSize: 12, color: "var(--text)", margin: 0 }}>
                    {o.pickupLocation} → {o.dropoffLocation}
                  </p>
                  <p style={{ fontSize: 11, color: "var(--text-faint)", margin: "2px 0 0" }}>
                    {fmtDate(o.completedAt)}
                  </p>
                </div>
                {o.tripFare != null && (
                  <span style={{ fontSize: 12, color: "var(--text-dim)", flexShrink: 0, marginLeft: 12 }}>
                    {fmtSGD(o.tripFare)}
                  </span>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
