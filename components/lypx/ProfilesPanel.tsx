"use client";

import { useRouter } from "next/navigation";
import { formatTZDate, isExpired, isWithinDays, DEFAULT_TIMEZONE } from "@/lib/utils/date";
import Link from "next/link";

type Driver = {
  id: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  complianceStatus: string;
  centralPoolEligible: boolean;
  documents: { id: string; docType: string; status: string; expiryDate: Date | null }[];
  vehicleOwnerships: { vehicle: { id: string; plateNumber: string; make: string; model: string } }[];
  orders: { id: string; completedAt: Date | null }[];
};

type Account = {
  id: string;
  name: string;
  customerSegment: string;
  claims: { status: string; claimedAt: Date; wonAt: Date | null; protectionTier: string }[];
  orders: { id: string; completedAt: Date | null }[];
};

interface Props {
  sub: string;
  selectedDriverId?: string;
  selectedAccountId?: string;
  drivers: Driver[];
  accounts: Account[];
  tenantId: string;
  timezone?: string;
}

const STATUS_COLOURS: Record<string, string> = {
  active:        "#4CAF6D",
  expiring_soon: "#E5A93C",
  suspended:     "#D9534F",
  pending:       "var(--text-faint)",
};

export function ProfilesPanel({ sub, selectedDriverId, selectedAccountId, drivers, accounts, tenantId, timezone = DEFAULT_TIMEZONE }: Props) {
  const router = useRouter();

  const selectedDriver = drivers.find(d => d.id === selectedDriverId) ?? drivers[0];
  const selectedAccount = accounts.find(a => a.id === selectedAccountId) ?? accounts[0];

  function docStatus(doc: { status: string; expiryDate: Date | null }) {
    if (doc.status === "verified" && isExpired(doc.expiryDate)) return { label: "EXPIRED", cls: "chip chip-red" };
    if (doc.status === "verified" && isWithinDays(doc.expiryDate, 30)) return { label: "EXPIRING", cls: "chip chip-amber" };
    if (doc.status === "verified") return { label: "VALID", cls: "chip chip-green" };
    if (doc.status === "pending_review") return { label: "PENDING", cls: "chip chip-blue" };
    return { label: doc.status.toUpperCase(), cls: "chip chip-dim" };
  }

  const colStyle: React.CSSProperties = {
    width: "25%", borderRight: "1px solid var(--border)", overflowY: "auto", height: "100%",
  };
  const detailStyle: React.CSSProperties = {
    flex: 1, overflowY: "auto", padding: 24, height: "100%",
  };

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      {/* Sub-tabs */}
      <div style={{ borderBottom: "1px solid var(--border)", display: "flex", gap: 0, padding: "0 20px", background: "var(--bg)", flexShrink: 0 }}>
        {["drivers", "accounts"].map(s => (
          <button key={s}
            onClick={() => router.push(`/operator/profiles?sub=${s}`)}
            style={{
              background: "none", border: "none", borderBottom: sub === s ? "2px solid var(--accent)" : "2px solid transparent",
              color: sub === s ? "var(--text)" : "var(--text-dim)", fontWeight: sub === s ? 600 : 500,
              fontSize: 12.5, padding: "10px 16px", cursor: "pointer", textTransform: "capitalize",
            }}>
            {s}
          </button>
        ))}
      </div>

      <div style={{ flex: 1, display: "grid", gridTemplateColumns: "25% 75%", overflow: "hidden" }}>
        {/* LEFT: list */}
        <div style={colStyle}>
          <div style={{ padding: "14px 16px 8px" }}>
            <input placeholder={`Search ${sub}…`} style={{
              width: "100%", background: "var(--surface-raised)", border: "1px solid var(--border)",
              borderRadius: 4, color: "var(--text)", fontSize: 12, padding: "6px 10px",
            }} />
          </div>

          {sub === "drivers" && drivers.map(d => (
            <div key={d.id}
              onClick={() => router.push(`/operator/profiles?sub=drivers&driver=${d.id}`)}
              style={{
                padding: "10px 16px", cursor: "pointer", borderBottom: "1px solid var(--border)",
                background: selectedDriver?.id === d.id ? "var(--surface)" : "transparent",
              }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>
                  {d.firstName} {d.lastName}
                </span>
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  {d.centralPoolEligible && (
                    <span style={{ fontSize: 9, fontWeight: 700, color: "#7FC8F8", border: "1px solid #23384a", borderRadius: 3, padding: "1px 4px" }}>T2</span>
                  )}
                  <span style={{ fontSize: 9, color: STATUS_COLOURS[d.complianceStatus] ?? "var(--text-faint)" }}>●</span>
                </div>
              </div>
              {d.vehicleOwnerships[0] && (
                <p className="mono" style={{ fontSize: 11, color: "var(--text-faint)", marginTop: 2 }}>
                  {d.vehicleOwnerships[0].vehicle.plateNumber}
                </p>
              )}
            </div>
          ))}

          {sub === "accounts" && accounts.map(a => (
            <div key={a.id}
              onClick={() => router.push(`/operator/profiles?sub=accounts&account=${a.id}`)}
              style={{
                padding: "10px 16px", cursor: "pointer", borderBottom: "1px solid var(--border)",
                background: selectedAccount?.id === a.id ? "var(--surface)" : "transparent",
              }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{a.name}</span>
              <p style={{ fontSize: 11, color: "var(--text-faint)", marginTop: 2, textTransform: "capitalize" }}>
                {a.customerSegment?.replace("_", " ")}
              </p>
            </div>
          ))}
        </div>

        {/* RIGHT: detail */}
        <div style={detailStyle}>
          {sub === "drivers" && selectedDriver && (
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
                <div style={{
                  width: 48, height: 48, borderRadius: 8, background: "var(--surface-raised)",
                  border: "1px solid var(--border)", display: "flex", alignItems: "center",
                  justifyContent: "center", fontSize: 16, fontWeight: 700, color: "var(--accent)",
                }}>
                  {selectedDriver.firstName[0]}{selectedDriver.lastName[0]}
                </div>
                <div>
                  <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--text)" }}>
                    {selectedDriver.firstName} {selectedDriver.lastName}
                  </h2>
                  <p className="mono" style={{ fontSize: 12, color: "var(--text-faint)", marginTop: 2 }}>
                    {selectedDriver.phoneNumber}
                  </p>
                </div>
                <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
                  <span style={{ fontSize: 12, color: STATUS_COLOURS[selectedDriver.complianceStatus], fontWeight: 600 }}>
                    ● {selectedDriver.complianceStatus.replace("_", " ").toUpperCase()}
                  </span>
                </div>
              </div>

              <p className="panel-title" style={{ marginBottom: 12 }}>Compliance Documents</p>
              <div style={{ marginBottom: 24 }}>
                {selectedDriver.documents.length === 0 ? (
                  <p style={{ fontSize: 12, color: "var(--text-faint)" }}>No documents</p>
                ) : selectedDriver.documents.map(doc => {
                  const chip = docStatus(doc);
                  const daysLeft = doc.expiryDate
                    ? Math.ceil((new Date(doc.expiryDate).getTime() - Date.now()) / 86400000)
                    : null;
                  return (
                    <div key={doc.id} style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      padding: "10px 0", borderBottom: "1px solid var(--border)",
                    }}>
                      <div>
                        <p style={{ fontSize: 13, color: "var(--text)", textTransform: "capitalize" }}>
                          {doc.docType.replace("_", " ")}
                        </p>
                        <p style={{ fontSize: 11, color: "var(--text-faint)", marginTop: 2 }}>
                          {!doc.expiryDate
                            ? "No expiry date"
                            : isExpired(doc.expiryDate)
                              ? `Expired ${daysLeft !== null ? -daysLeft : "?"} days ago`
                              : `Valid until ${formatTZDate(doc.expiryDate, timezone)}`}
                          {doc.expiryDate && !isExpired(doc.expiryDate) && daysLeft !== null && daysLeft <= 60 && (
                            <span style={{ color: "var(--red)", marginLeft: 8 }}>
                              [{daysLeft} days] UPLOAD NOW
                            </span>
                          )}
                        </p>
                      </div>
                      <span className={chip.cls}>{chip.label}</span>
                    </div>
                  );
                })}
              </div>

              <p className="panel-title" style={{ marginBottom: 12 }}>Tier Membership</p>
              <div style={{ marginBottom: 24 }}>
                <p style={{ fontSize: 13, color: "var(--text)", marginBottom: 6 }}>● Tier 1 (This operator)</p>
                {selectedDriver.centralPoolEligible && (
                  <p style={{ fontSize: 13, color: "var(--text)" }}>● Tier 2 (Platform premium)</p>
                )}
              </div>

              <p className="panel-title" style={{ marginBottom: 12 }}>Trip History (last 30 days)</p>
              <p style={{ fontSize: 13, color: "var(--text)", marginBottom: 16 }}>
                {selectedDriver.orders.length} trips completed
              </p>

              <div style={{ display: "flex", gap: 8 }}>
                <Link href={`/drivers/${selectedDriver.id}`} style={{
                  background: "var(--surface-raised)", border: "1px solid var(--border)", borderRadius: 4,
                  color: "var(--text-dim)", fontSize: 12, padding: "8px 14px", textDecoration: "none",
                }}>View Full Profile</Link>
              </div>
            </div>
          )}

          {sub === "accounts" && selectedAccount && (
            <div>
              <div style={{ marginBottom: 24 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                  <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--text)" }}>{selectedAccount.name}</h2>
                  <span className="chip chip-blue" style={{ textTransform: "capitalize" }}>
                    {selectedAccount.customerSegment?.replace("_", " ")}
                  </span>
                  {selectedAccount.claims[0]?.protectionTier === "long_term" && (
                    <span className="chip chip-green">🏆 Protected</span>
                  )}
                </div>
              </div>

              {selectedAccount.claims[0] && (
                <>
                  <p className="panel-title" style={{ marginBottom: 12 }}>Claim Status</p>
                  <div style={{ marginBottom: 24 }}>
                    <p style={{ fontSize: 13, color: "var(--text)", marginBottom: 4 }}>
                      {selectedAccount.claims[0].wonAt
                        ? `Won: ${formatTZDate(selectedAccount.claims[0].wonAt, timezone)}`
                        : `Claimed: ${formatTZDate(selectedAccount.claims[0].claimedAt, timezone)}`}
                    </p>
                    <p style={{ fontSize: 12, color: "var(--text-faint)" }}>
                      Protection: {selectedAccount.claims[0].protectionTier?.replace("_", "-")}
                    </p>
                  </div>
                </>
              )}

              <p className="panel-title" style={{ marginBottom: 12 }}>Trip History</p>
              <p style={{ fontSize: 13, color: "var(--text)", marginBottom: 16 }}>
                {selectedAccount.orders.length} trips
                {selectedAccount.orders[0]?.completedAt && (
                  <span style={{ color: "var(--text-dim)" }}>
                    {" · Last trip: "}{formatTZDate(selectedAccount.orders[0].completedAt, timezone)}
                  </span>
                )}
              </p>
            </div>
          )}

          {((sub === "drivers" && drivers.length === 0) || (sub === "accounts" && accounts.length === 0)) && (
            <div style={{ textAlign: "center", padding: "64px 0", color: "var(--text-faint)", fontSize: 13 }}>
              No {sub} found
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
