"use client";

import { useState, useEffect, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

// ─── Types ────────────────────────────────────────────────────────────────────

export type DriverListItem = {
  id: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  complianceStatus: string;
  tier1Member: boolean;
  tier2Qualified: boolean;
  vehicleClass: string | null;
  vehicle: { plateNumber: string; make: string; model: string; vehicleClass?: string | null } | null;
  vocationalLicenceExpiry: string | null;
  tripCount30d: number;
};

export type AccountListItem = {
  claimId: string;
  accountId: string;
  name: string;
  uen: string | null;
  customerSegment: string;
  claimStatus: string;
  protectionTier: string;
  claimedAt: string;
  expiryAt: string;
  wonAt: string | null;
  daysRemaining: number;
  totalTrips: number;
  lastTripAt: string | null;
};

type DriverDetail = {
  id: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  complianceStatus: string;
  tier1Member: boolean;
  tier2Qualified: boolean;
  addedAt: string;
  licenceNumber: string | null;
  vocationalLicenceNumber: string | null;
  vocationalLicenceExpiry: string | null;
  documents: { id: string; docType: string; status: string; expiryDate: string; issuedDate: string | null }[];
  vehicle: { id: string; plateNumber: string; make: string; model: string; vehicleClass: string | null } | null;
  recentOrders: { id: string; completedAt: string | null; pickupLocation: string; dropoffLocation: string; tripFare: number | null }[];
  tripCount30d: number;
  earningsThisMonth: number;
};

type AccountDetail = {
  accountId: string;
  name: string;
  uen: string | null;
  customerSegment: string;
  claim: {
    id: string;
    status: string;
    protectionTier: string;
    claimedAt: string;
    expiryAt: string;
    wonAt: string | null;
    daysRemaining: number;
    progressPercent: number;
  };
  totalTrips: number;
  recentOrders: { id: string; completedAt: string | null; pickupLocation: string; dropoffLocation: string; tripFare: number | null }[];
};

type SearchResult = {
  found: boolean;
  driver?: {
    id: string;
    firstName: string;
    lastName: string;
    phoneNumber: string;
    complianceStatus: string;
    alreadyMember: boolean;
    tier1Member: boolean;
    vocationalLicenceNumber: string;
    vocationalLicenceExpiry: string;
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

function TierChip({ tier1, tier2 }: { tier1: boolean; tier2: boolean }) {
  if (tier1) return (
    <span style={{ fontSize: 9, fontWeight: 700, padding: "1px 5px", borderRadius: 3, background: "#3d2f00", color: "#E5A93C", border: "1px solid #5a4500" }}>T1</span>
  );
  if (tier2) return (
    <span style={{ fontSize: 9, fontWeight: 700, padding: "1px 5px", borderRadius: 3, background: "#0f2535", color: "#7FC8F8", border: "1px solid #1a3a5f" }}>T2</span>
  );
  return (
    <span style={{ fontSize: 9, fontWeight: 700, padding: "1px 5px", borderRadius: 3, background: "var(--surface-raised)", color: "var(--text-faint)", border: "1px solid var(--border)" }}>T3</span>
  );
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

function DocChip({ expiryDate, status }: { expiryDate: string; status: string }) {
  const daysLeft = Math.ceil((new Date(expiryDate).getTime() - Date.now()) / 86400000);
  if (status !== "verified") {
    if (status === "pending_review") return <span className="chip chip-blue">PENDING</span>;
    return <span className="chip chip-dim">{status.toUpperCase()}</span>;
  }
  if (daysLeft < 0) return <span className="chip chip-red">EXPIRED</span>;
  if (daysLeft <= 30) return <span className="chip chip-red">EXPIRING</span>;
  if (daysLeft <= 90) return <span className="chip chip-amber">EXPIRING</span>;
  return <span className="chip chip-green">VALID</span>;
}

function AccountStatusIcon({ status, protectionTier, daysRemaining }: { status: string; protectionTier: string; daysRemaining: number }) {
  if (daysRemaining <= 14 && status !== "won") return <span title="Expiring soon">⚠️</span>;
  if (status === "won" && protectionTier === "long_term") return <span title="Won — Long-term">🏆</span>;
  if (status === "won") return <span style={{ color: "#4CAF6D", fontWeight: 700, fontSize: 14 }}>✓</span>;
  return <span title="Claimed">⏱</span>;
}

function fmtDate(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-SG", { day: "2-digit", month: "short", year: "numeric" });
}

function fmtSGD(amount: number) {
  return `S$${amount.toFixed(2)}`;
}

const SEGMENT_LABEL: Record<string, string> = {
  hotel: "Hotel", mice: "MICE", tdm: "TDM", dmc: "DMC", corporate_general: "Corporate",
};

// ─── Main Component ───────────────────────────────────────────────────────────

interface Props {
  initialDrivers: DriverListItem[];
  initialAccounts: AccountListItem[];
  sub: "drivers" | "accounts";
  timezone: string;
  tenantId: string;
}

export function ProfilesPageClient({ initialDrivers, initialAccounts, sub, timezone, tenantId }: Props) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  // Lists (refreshable)
  const [drivers, setDrivers] = useState<DriverListItem[]>(initialDrivers);
  const [accounts] = useState<AccountListItem[]>(initialAccounts);

  // Driver selection + detail
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(drivers[0]?.id ?? null);
  const [driverDetail, setDriverDetail] = useState<DriverDetail | null>(null);
  const [driverDetailLoading, setDriverDetailLoading] = useState(false);

  // Account selection + detail
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(accounts[0]?.accountId ?? null);
  const [accountDetail, setAccountDetail] = useState<AccountDetail | null>(null);
  const [accountDetailLoading, setAccountDetailLoading] = useState(false);

  // Client-side search filter
  const [search, setSearch] = useState("");

  // Add Driver drawer
  const [addDriverOpen, setAddDriverOpen] = useState(false);
  const [licenceInput, setLicenceInput] = useState("");
  const [licenceResult, setLicenceResult] = useState<SearchResult | null>(null);
  const [licenceSearching, setLicenceSearching] = useState(false);
  const [addingTier1, setAddingTier1] = useState(false);
  const [tier1Mutating, setTier1Mutating] = useState(false);
  const [tier1Error, setTier1Error] = useState<string | null>(null);

  const licenceInputRef = useRef<HTMLInputElement>(null);

  // Fetch driver detail when selection changes
  useEffect(() => {
    if (sub !== "drivers" || !selectedDriverId) { setDriverDetail(null); return; }
    setDriverDetailLoading(true);
    fetch(`/api/operator/profiles/drivers/${selectedDriverId}`)
      .then((r) => r.json())
      .then((d) => { setDriverDetail(d); setDriverDetailLoading(false); })
      .catch(() => setDriverDetailLoading(false));
  }, [selectedDriverId, sub]);

  // Fetch account detail when selection changes
  useEffect(() => {
    if (sub !== "accounts" || !selectedAccountId) { setAccountDetail(null); return; }
    setAccountDetailLoading(true);
    fetch(`/api/operator/profiles/accounts/${selectedAccountId}`)
      .then((r) => r.json())
      .then((d) => { setAccountDetail(d); setAccountDetailLoading(false); })
      .catch(() => setAccountDetailLoading(false));
  }, [selectedAccountId, sub]);

  // Focus licence input when drawer opens
  useEffect(() => {
    if (addDriverOpen) {
      setLicenceInput("");
      setLicenceResult(null);
      setTier1Error(null);
      setTimeout(() => licenceInputRef.current?.focus(), 50);
    }
  }, [addDriverOpen]);

  async function refreshDriverList() {
    const res = await fetch("/api/operator/profiles/drivers");
    if (res.ok) setDrivers(await res.json());
  }

  async function handleLicenceSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!licenceInput.trim()) return;
    setLicenceSearching(true);
    setLicenceResult(null);
    setTier1Error(null);
    const res = await fetch(`/api/operator/profiles/drivers/search?licence=${encodeURIComponent(licenceInput.trim())}`);
    setLicenceResult(await res.json());
    setLicenceSearching(false);
  }

  async function handleAddTier1(driverId: string) {
    setAddingTier1(true);
    setTier1Error(null);
    const res = await fetch(`/api/operator/profiles/drivers/${driverId}/add-tier1`, { method: "POST" });
    if (!res.ok) {
      const d = await res.json();
      setTier1Error(d.error ?? "Failed to add driver");
      setAddingTier1(false);
      return;
    }
    await refreshDriverList();
    setAddDriverOpen(false);
    setSelectedDriverId(driverId);
    setAddingTier1(false);
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
    // Re-fetch detail
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

  const filteredAccounts = accounts.filter((a) => {
    const q = search.toLowerCase();
    return a.name.toLowerCase().includes(q) || (a.uen ?? "").toLowerCase().includes(q);
  });

  // ─── Layout styles ─────────────────────────────────────────────────────────

  const leftPanelStyle: React.CSSProperties = {
    width: "25%", borderRight: "1px solid var(--border)", overflowY: "auto", height: "100%",
    display: "flex", flexDirection: "column",
  };
  const rightPanelStyle: React.CSSProperties = {
    flex: 1, overflowY: "auto", height: "100%",
  };

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      {/* Sub-tabs */}
      <div style={{ borderBottom: "1px solid var(--border)", display: "flex", gap: 0, padding: "0 20px", background: "var(--bg)", flexShrink: 0 }}>
        {(["drivers", "accounts"] as const).map((s) => (
          <button
            key={s}
            onClick={() => {
              setSearch("");
              startTransition(() => router.push(`/operator/profiles?sub=${s}`));
            }}
            style={{
              background: "none", border: "none",
              borderBottom: sub === s ? "2px solid var(--accent)" : "2px solid transparent",
              color: sub === s ? "var(--text)" : "var(--text-dim)",
              fontWeight: sub === s ? 600 : 500,
              fontSize: 12.5, padding: "10px 16px", cursor: "pointer", textTransform: "capitalize",
            }}
          >
            {s}
          </button>
        ))}
      </div>

      {/* 25/75 split */}
      <div style={{ flex: 1, display: "grid", gridTemplateColumns: "25% 75%", overflow: "hidden" }}>
        {/* ── LEFT PANEL ─────────────────────────────────────────────────── */}
        <div style={leftPanelStyle}>
          <div style={{ padding: "12px 12px 8px", flexShrink: 0 }}>
            <input
              placeholder={`Search ${sub}…`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: "100%", background: "var(--surface-raised)", border: "1px solid var(--border)",
                borderRadius: 4, color: "var(--text)", fontSize: 12, padding: "6px 10px", outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>

          {sub === "drivers" && (
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
          )}

          <div style={{ flex: 1, overflowY: "auto" }}>
            {sub === "drivers" && filteredDrivers.map((d) => (
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
                    <TierChip tier1={d.tier1Member} tier2={d.tier2Qualified} />
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

            {sub === "drivers" && filteredDrivers.length === 0 && (
              <p style={{ padding: "32px 16px", textAlign: "center", fontSize: 12, color: "var(--text-faint)" }}>
                {drivers.length === 0 ? "No drivers yet" : "No results"}
              </p>
            )}

            {sub === "accounts" && filteredAccounts.map((a) => (
              <div
                key={a.accountId}
                onClick={() => setSelectedAccountId(a.accountId)}
                style={{
                  padding: "10px 12px", cursor: "pointer", borderBottom: "1px solid var(--border)",
                  background: selectedAccountId === a.accountId ? "var(--surface)" : "transparent",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                  <AccountStatusIcon status={a.claimStatus} protectionTier={a.protectionTier} daysRemaining={a.daysRemaining} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{a.name}</span>
                </div>
                <p style={{ fontSize: 11, color: "var(--text-faint)", margin: "0 0 0 22px" }}>
                  {SEGMENT_LABEL[a.customerSegment] ?? a.customerSegment}
                  {a.claimStatus !== "won" && (
                    <span style={{ marginLeft: 6, color: a.daysRemaining <= 14 ? "#D9534F" : a.daysRemaining <= 30 ? "#E5A93C" : "var(--text-faint)" }}>
                      · {a.daysRemaining}d left
                    </span>
                  )}
                </p>
              </div>
            ))}

            {sub === "accounts" && filteredAccounts.length === 0 && (
              <p style={{ padding: "32px 16px", textAlign: "center", fontSize: 12, color: "var(--text-faint)" }}>
                {accounts.length === 0 ? "No accounts claimed" : "No results"}
              </p>
            )}
          </div>
        </div>

        {/* ── RIGHT PANEL ────────────────────────────────────────────────── */}
        <div style={rightPanelStyle}>
          {/* Driver detail */}
          {sub === "drivers" && (
            driverDetailLoading ? (
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
              <EmptyDetail label="Select a driver" />
            )
          )}

          {/* Account detail */}
          {sub === "accounts" && (
            accountDetailLoading ? (
              <div style={{ padding: 32, color: "var(--text-faint)", fontSize: 13 }}>Loading…</div>
            ) : accountDetail ? (
              <AccountDetailView detail={accountDetail} timezone={timezone} />
            ) : (
              <EmptyDetail label="Select an account" />
            )
          )}
        </div>
      </div>

      {/* ── Add Driver Drawer ───────────────────────────────────────────────── */}
      {addDriverOpen && (
        <>
          <div onClick={() => setAddDriverOpen(false)} style={{ position: "fixed", inset: 0, background: "#00000066", zIndex: 40 }} />
          <div style={{
            position: "fixed", top: 0, right: 0, bottom: 0, width: 420,
            background: "var(--surface)", borderLeft: "1px solid var(--border)",
            zIndex: 50, display: "flex", flexDirection: "column",
          }}>
            <div style={{ padding: "24px 24px 16px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: "var(--text)" }}>Add Driver</h2>
                <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--text-dim)" }}>Search by vocational licence number</p>
              </div>
              <button onClick={() => setAddDriverOpen(false)} style={{ background: "none", border: "none", color: "var(--text-dim)", fontSize: 22, cursor: "pointer", lineHeight: 1 }}>×</button>
            </div>

            <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 20, flex: 1, overflowY: "auto" }}>
              <form onSubmit={handleLicenceSearch} style={{ display: "flex", gap: 8 }}>
                <input
                  ref={licenceInputRef}
                  value={licenceInput}
                  onChange={(e) => { setLicenceInput(e.target.value.toUpperCase()); setLicenceResult(null); }}
                  placeholder="e.g. VL12345678"
                  style={{
                    flex: 1, background: "var(--surface-raised)", border: "1px solid var(--border)",
                    borderRadius: 4, color: "var(--text)", fontSize: 13, padding: "9px 12px", outline: "none",
                    fontFamily: "monospace",
                  }}
                />
                <button
                  type="submit"
                  disabled={!licenceInput.trim() || licenceSearching}
                  style={{
                    padding: "9px 16px", fontSize: 13, fontWeight: 600, background: "var(--accent)",
                    color: "#000", border: "none", borderRadius: 4, cursor: "pointer", flexShrink: 0,
                  }}
                >
                  {licenceSearching ? "…" : "Search"}
                </button>
              </form>

              {licenceResult && !licenceResult.found && (
                <div style={{ background: "var(--surface-raised)", border: "1px solid var(--border)", borderRadius: 8, padding: 16, textAlign: "center" }}>
                  <p style={{ fontSize: 13, color: "var(--text-dim)", marginBottom: 12 }}>
                    No driver found with that vocational licence.
                  </p>
                  <Link
                    href="/onboard"
                    target="_blank"
                    style={{
                      fontSize: 13, fontWeight: 600, color: "var(--accent)",
                      textDecoration: "none", border: "1px solid var(--accent)",
                      padding: "8px 16px", borderRadius: 4, display: "inline-block",
                    }}
                  >
                    Invite to self-onboard →
                  </Link>
                </div>
              )}

              {licenceResult?.found && licenceResult.driver && (
                <div style={{ background: "var(--surface-raised)", border: "1px solid var(--border)", borderRadius: 8, padding: 16 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                    <StatusDot status={licenceResult.driver.complianceStatus} />
                    <div>
                      <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "var(--text)" }}>
                        {licenceResult.driver.firstName} {licenceResult.driver.lastName}
                      </p>
                      <p className="mono" style={{ margin: "2px 0 0", fontSize: 12, color: "var(--text-faint)" }}>
                        {licenceResult.driver.phoneNumber}
                      </p>
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                    <span style={{ fontSize: 11, color: "var(--text-dim)", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 4, padding: "3px 8px" }}>
                      {licenceResult.driver.vocationalLicenceNumber}
                    </span>
                    <span style={{ fontSize: 11, color: "var(--text-dim)", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 4, padding: "3px 8px" }}>
                      Expiry: {fmtDate(licenceResult.driver.vocationalLicenceExpiry)}
                    </span>
                  </div>

                  {licenceResult.driver.alreadyMember && licenceResult.driver.tier1Member && (
                    <p style={{ fontSize: 13, color: "#4CAF6D", fontWeight: 500 }}>✓ Already a Tier 1 member</p>
                  )}
                  {licenceResult.driver.alreadyMember && !licenceResult.driver.tier1Member && (
                    <p style={{ fontSize: 12, color: "var(--text-dim)", marginBottom: 10 }}>This driver is already in your pool (T3). Add to Tier 1?</p>
                  )}
                  {licenceResult.driver.complianceStatus !== "active" && (
                    <p style={{ fontSize: 12, color: "#E5A93C" }}>Driver is not active — cannot add to Tier 1</p>
                  )}

                  {tier1Error && <p style={{ fontSize: 12, color: "#D9534F", marginTop: 8 }}>{tier1Error}</p>}

                  {licenceResult.driver.complianceStatus === "active" && !(licenceResult.driver.alreadyMember && licenceResult.driver.tier1Member) && (
                    <button
                      onClick={() => handleAddTier1(licenceResult.driver!.id)}
                      disabled={addingTier1}
                      className="btn-primary"
                      style={{ fontSize: 13, padding: "9px 18px", marginTop: 8 }}
                    >
                      {addingTier1 ? "Adding…" : "Add to Tier 1"}
                    </button>
                  )}
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
          <TierChip tier1={d.tier1Member} tier2={d.tier2Qualified} />
          <ClassChip cls={d.vehicle?.vehicleClass} />
        </div>
      </div>

      {/* Compliance Documents */}
      <p className="panel-title" style={{ marginBottom: 10 }}>Compliance Documents</p>
      <div style={{ marginBottom: 24 }}>
        {d.documents.length === 0 ? (
          <p style={{ fontSize: 12, color: "var(--text-faint)" }}>No documents on file</p>
        ) : d.documents.map((doc) => {
          const daysLeft = Math.ceil((new Date(doc.expiryDate).getTime() - Date.now()) / 86400000);
          return (
            <div key={doc.id} style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "10px 0", borderBottom: "1px solid var(--border)",
            }}>
              <div>
                <p style={{ fontSize: 13, color: "var(--text)", margin: 0, textTransform: "capitalize" }}>
                  {doc.docType.replace(/_/g, " ")}
                </p>
                <p style={{ fontSize: 11, color: "var(--text-faint)", margin: "3px 0 0" }}>
                  {daysLeft < 0
                    ? `Expired ${Math.abs(daysLeft)} days ago`
                    : `Expires ${fmtDate(doc.expiryDate)} · ${daysLeft}d`}
                </p>
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
            <TierChip tier1={true} tier2={false} />
            <span style={{ fontSize: 13, color: d.tier1Member ? "var(--text)" : "var(--text-faint)" }}>
              {d.tier1Member ? "Tier 1 — This operator" : "Not a Tier 1 member"}
            </span>
          </div>
          {d.tier1Member && (
            <button
              onClick={onRemoveTier1}
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
        {d.tier2Qualified && (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <TierChip tier1={false} tier2={true} />
            <span style={{ fontSize: 13, color: "var(--text)" }}>Tier 2 — Platform premium</span>
          </div>
        )}
        {removeError && <p style={{ fontSize: 12, color: "#D9534F" }}>{removeError}</p>}
      </div>

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

      {/* Recent trips */}
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

// ─── Account Detail View ──────────────────────────────────────────────────────

function AccountDetailView({ detail, timezone }: { detail: AccountDetail; timezone: string }) {
  const a = detail;
  const c = a.claim;
  const barColor = c.daysRemaining > 90 ? "#4CAF6D" : c.daysRemaining > 30 ? "#E5A93C" : "#D9534F";

  return (
    <div style={{ padding: 28 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 28 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--text)", margin: 0 }}>{a.name}</h2>
            <span style={{
              fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px",
              padding: "2px 8px", borderRadius: 10, background: "var(--surface-raised)",
              border: "1px solid var(--border)", color: "var(--text-dim)",
            }}>
              {SEGMENT_LABEL[a.customerSegment] ?? a.customerSegment}
            </span>
            {c.status === "won" && c.protectionTier === "long_term" && (
              <span style={{ fontSize: 11, color: "#E5A93C", fontWeight: 600 }}>🏆 Long-term</span>
            )}
          </div>
          {a.uen && (
            <p className="mono" style={{ fontSize: 12, color: "var(--text-faint)", margin: 0 }}>UEN: {a.uen}</p>
          )}
        </div>
        <Link
          href={`/operator/dispatch`}
          style={{
            marginLeft: "auto", flexShrink: 0, fontSize: 12, fontWeight: 600,
            color: "var(--accent)", border: "1px solid var(--accent)",
            padding: "7px 14px", borderRadius: 4, textDecoration: "none",
          }}
        >
          New Reservation
        </Link>
      </div>

      {/* Claim Countdown */}
      <p className="panel-title" style={{ marginBottom: 10 }}>Claim Status</p>
      <div style={{ marginBottom: 24, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, padding: "16px 18px" }}>
        {c.status === "won" ? (
          <p style={{ fontSize: 14, fontWeight: 600, color: "#4CAF6D", margin: "0 0 4px" }}>
            {c.protectionTier === "long_term" ? "🏆 Won — Long-term Protection" : "✓ Won — Standard Protection"}
          </p>
        ) : (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <p style={{ fontSize: 13, fontWeight: 500, color: "var(--text)", margin: 0 }}>
                {c.daysRemaining} days remaining
              </p>
              <p style={{ fontSize: 12, color: "var(--text-faint)", margin: 0 }}>{c.progressPercent}% elapsed</p>
            </div>
            <div style={{ height: 6, background: "var(--surface-raised)", borderRadius: 3, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${c.progressPercent}%`, background: barColor, borderRadius: 3 }} />
            </div>
          </>
        )}
        <div style={{ display: "flex", gap: 16, marginTop: 12 }}>
          <span style={{ fontSize: 11, color: "var(--text-faint)" }}>Claimed: {fmtDate(c.claimedAt)}</span>
          {c.wonAt
            ? <span style={{ fontSize: 11, color: "var(--text-faint)" }}>Won: {fmtDate(c.wonAt)}</span>
            : <span style={{ fontSize: 11, color: "var(--text-faint)" }}>Expires: {fmtDate(c.expiryAt)}</span>}
        </div>
      </div>

      {/* Trip Stats */}
      <p className="panel-title" style={{ marginBottom: 10 }}>Trip History</p>
      <div style={{ marginBottom: 24, padding: "14px 16px", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 6 }}>
        <p style={{ fontSize: 24, fontWeight: 700, color: "var(--text)", margin: "0 0 2px" }}>{a.totalTrips}</p>
        <p style={{ fontSize: 12, color: "var(--text-faint)", margin: 0 }}>trips with this operator</p>
      </div>

      {a.recentOrders.length > 0 && (
        <div>
          {a.recentOrders.slice(0, 8).map((o) => (
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
      )}
    </div>
  );
}

function EmptyDetail({ label }: { label: string }) {
  return (
    <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-faint)", fontSize: 13 }}>
      {label}
    </div>
  );
}
