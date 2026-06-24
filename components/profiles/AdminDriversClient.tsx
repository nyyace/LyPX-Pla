"use client";

import { useState, useEffect } from "react";

const STATUS_COLOUR: Record<string, string> = {
  active:        "#4CAF6D",
  expiring_soon: "#E5A93C",
  suspended:     "#D9534F",
  pending:       "var(--text-faint)",
};

const CLASS_STYLE: Record<string, React.CSSProperties> = {
  VVV: { background: "#2d1a5a", color: "#c4b5fd", border: "1px solid #4B2D8F" },
  AVF: { background: "#0f2535", color: "#7FC8F8", border: "1px solid #1a3a5f" },
  NVE: { background: "#1a3d2b", color: "#4CAF6D", border: "1px solid #2d6b4a" },
};

type DriverListItem = {
  id: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  complianceStatus: string;
  tier2Qualified: boolean;
  vehicleClass: string | null;
  plateNumber: string | null;
  operatorNames: string[];
  totalTrips: number;
};

type DriverDetail = {
  id: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  licenseNumber: string | null;
  complianceStatus: string;
  tier2Qualified: boolean;
  sourceType: string;
  createdAt: string;
  documents: { id: string; docType: string; status: string; expiryDate: string; issuedDate: string | null }[];
  memberships: { id: string; tenantId: string; tenantName: string; tier1Member: boolean; relationshipType: string; addedAt: string }[];
  vehicles: { plateNumber: string; make: string; model: string; vehicleClass: string | null }[];
  submission: {
    vocationalLicenceNumber: string;
    vocationalLicenceExpiryDate: string;
    drivingLicenceNumber: string;
    submittedAt: string;
  } | null;
  recentOrders: { id: string; completedAt: string | null; pickupLocation: string; dropoffLocation: string; tripFare: number | null; operatorName: string }[];
  totalTrips: number;
};

function StatusDot({ status }: { status: string }) {
  return (
    <span style={{
      display: "inline-block", width: 7, height: 7, borderRadius: "50%",
      background: STATUS_COLOUR[status] ?? "var(--text-faint)", flexShrink: 0,
    }} />
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

function fmtDate(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-SG", { day: "2-digit", month: "short", year: "numeric" });
}

interface Props {
  drivers: DriverListItem[];
}

export function AdminDriversClient({ drivers: initialDrivers }: Props) {
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(initialDrivers[0]?.id ?? null);
  const [detail, setDetail] = useState<DriverDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  useEffect(() => {
    if (!selectedId) { setDetail(null); return; }
    setLoading(true);
    fetch(`/api/admin/drivers/${selectedId}`)
      .then((r) => r.json())
      .then((d) => { setDetail(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [selectedId]);

  const filtered = initialDrivers.filter((d) => {
    const q = search.toLowerCase();
    const matchesSearch =
      d.firstName.toLowerCase().includes(q) ||
      d.lastName.toLowerCase().includes(q) ||
      (d.plateNumber ?? "").toLowerCase().includes(q) ||
      d.operatorNames.some((n) => n.toLowerCase().includes(q));
    const matchesStatus = statusFilter === "all" || d.complianceStatus === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const statusCounts = {
    active: initialDrivers.filter((d) => d.complianceStatus === "active").length,
    expiring_soon: initialDrivers.filter((d) => d.complianceStatus === "expiring_soon").length,
    suspended: initialDrivers.filter((d) => d.complianceStatus === "suspended").length,
    pending: initialDrivers.filter((d) => d.complianceStatus === "pending").length,
  };

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* Filter bar */}
      <div style={{ padding: "12px 24px", borderBottom: "1px solid var(--border)", display: "flex", gap: 10, alignItems: "center", flexShrink: 0 }}>
        <input
          placeholder="Search name, plate, operator…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            width: 280, background: "var(--surface-raised)", border: "1px solid var(--border)",
            borderRadius: 4, color: "var(--text)", fontSize: 12, padding: "6px 10px", outline: "none",
          }}
        />
        <div style={{ display: "flex", gap: 6, marginLeft: 8 }}>
          {([
            ["all", `All (${initialDrivers.length})`],
            ["active", `Active (${statusCounts.active})`],
            ["expiring_soon", `Expiring (${statusCounts.expiring_soon})`],
            ["suspended", `Suspended (${statusCounts.suspended})`],
            ["pending", `Pending (${statusCounts.pending})`],
          ] as const).map(([val, label]) => (
            <button
              key={val}
              onClick={() => setStatusFilter(val)}
              style={{
                fontSize: 11, padding: "4px 10px", borderRadius: 4, cursor: "pointer",
                background: statusFilter === val ? "var(--accent)" : "var(--surface-raised)",
                color: statusFilter === val ? "#000" : "var(--text-dim)",
                border: statusFilter === val ? "none" : "1px solid var(--border)",
                fontWeight: statusFilter === val ? 600 : 400,
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* 25/75 split */}
      <div style={{ flex: 1, display: "grid", gridTemplateColumns: "300px 1fr", overflow: "hidden" }}>
        {/* Left list */}
        <div style={{ borderRight: "1px solid var(--border)", overflowY: "auto", height: "100%" }}>
          {filtered.length === 0 && (
            <p style={{ padding: "32px 16px", textAlign: "center", fontSize: 12, color: "var(--text-faint)" }}>
              {initialDrivers.length === 0 ? "No drivers on platform" : "No results"}
            </p>
          )}
          {filtered.map((d) => (
            <div
              key={d.id}
              onClick={() => setSelectedId(d.id)}
              style={{
                padding: "10px 14px", cursor: "pointer", borderBottom: "1px solid var(--border)",
                background: selectedId === d.id ? "var(--surface)" : "transparent",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                <StatusDot status={d.complianceStatus} />
                <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", flex: 1 }}>
                  {d.firstName} {d.lastName}
                </span>
                {d.tier2Qualified && (
                  <span style={{ fontSize: 9, fontWeight: 700, padding: "1px 5px", borderRadius: 3, background: "#0f2535", color: "#7FC8F8", border: "1px solid #1a3a5f" }}>T2</span>
                )}
                {d.vehicleClass && (
                  <span style={{ fontSize: 9, fontWeight: 700, padding: "1px 5px", borderRadius: 3, ...(CLASS_STYLE[d.vehicleClass] ?? {}) }}>{d.vehicleClass}</span>
                )}
              </div>
              <p className="mono" style={{ fontSize: 11, color: "var(--text-faint)", margin: "0 0 2px 13px" }}>
                {d.plateNumber ?? "No vehicle"}
              </p>
              {d.operatorNames.length > 0 && (
                <p style={{ fontSize: 11, color: "var(--text-faint)", margin: "0 0 0 13px" }}>
                  {d.operatorNames.slice(0, 2).join(", ")}
                  {d.operatorNames.length > 2 && ` +${d.operatorNames.length - 2}`}
                </p>
              )}
            </div>
          ))}
        </div>

        {/* Right detail */}
        <div style={{ overflowY: "auto", height: "100%" }}>
          {loading && (
            <div style={{ padding: 32, color: "var(--text-faint)", fontSize: 13 }}>Loading…</div>
          )}
          {!loading && !detail && (
            <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-faint)", fontSize: 13 }}>
              Select a driver
            </div>
          )}
          {!loading && detail && <DriverDetailPanel detail={detail} />}
        </div>
      </div>
    </div>
  );
}

function DriverDetailPanel({ detail: d }: { detail: DriverDetail }) {
  return (
    <div style={{ padding: 28 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 28 }}>
        <div style={{
          width: 48, height: 48, borderRadius: 8, background: "var(--surface-raised)",
          border: "1px solid var(--border)", display: "flex", alignItems: "center",
          justifyContent: "center", fontSize: 16, fontWeight: 700, color: "var(--accent)", flexShrink: 0,
        }}>
          {d.firstName[0]}{d.lastName[0]}
        </div>
        <div style={{ flex: 1 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--text)", margin: 0 }}>
            {d.firstName} {d.lastName}
          </h2>
          <p className="mono" style={{ fontSize: 12, color: "var(--text-faint)", margin: "3px 0 0" }}>
            {d.phoneNumber}
          </p>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
          <span style={{ fontSize: 12, color: STATUS_COLOUR[d.complianceStatus], fontWeight: 600 }}>
            ● {d.complianceStatus.replace(/_/g, " ").toUpperCase()}
          </span>
          <span style={{ fontSize: 11, color: "var(--text-faint)" }}>
            {d.sourceType === "self_submitted" ? "Self-onboarded" : "Operator-added"} · {fmtDate(d.createdAt)}
          </span>
        </div>
      </div>

      {/* Submission */}
      {d.submission && (
        <>
          <p className="panel-title" style={{ marginBottom: 10 }}>Licence Details</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 24 }}>
            <div style={{ padding: "12px 14px", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 6 }}>
              <p style={{ fontSize: 11, color: "var(--text-faint)", margin: "0 0 4px", textTransform: "uppercase", letterSpacing: "0.4px" }}>Driving Licence</p>
              <p className="mono" style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", margin: 0 }}>{d.submission.drivingLicenceNumber}</p>
            </div>
            <div style={{ padding: "12px 14px", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 6 }}>
              <p style={{ fontSize: 11, color: "var(--text-faint)", margin: "0 0 4px", textTransform: "uppercase", letterSpacing: "0.4px" }}>Vocational Licence</p>
              <p className="mono" style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", margin: 0 }}>{d.submission.vocationalLicenceNumber}</p>
              <p style={{ fontSize: 11, color: "var(--text-faint)", margin: "3px 0 0" }}>Expires {fmtDate(d.submission.vocationalLicenceExpiryDate)}</p>
            </div>
          </div>
        </>
      )}

      {/* Compliance documents */}
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
                    : `Expires ${fmtDate(doc.expiryDate)} · ${daysLeft}d remaining`}
                </p>
              </div>
              <DocChip expiryDate={doc.expiryDate} status={doc.status} />
            </div>
          );
        })}
      </div>

      {/* Operator memberships */}
      <p className="panel-title" style={{ marginBottom: 10 }}>Operator Memberships</p>
      <div style={{ marginBottom: 24 }}>
        {d.memberships.length === 0 ? (
          <p style={{ fontSize: 12, color: "var(--text-faint)" }}>No operator memberships</p>
        ) : d.memberships.map((m) => (
          <div key={m.id} style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "10px 0", borderBottom: "1px solid var(--border)",
          }}>
            <div>
              <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", margin: 0 }}>{m.tenantName}</p>
              <p style={{ fontSize: 11, color: "var(--text-faint)", margin: "3px 0 0", textTransform: "capitalize" }}>
                {m.relationshipType} · Added {fmtDate(m.addedAt)}
              </p>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              {m.tier1Member && (
                <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 3, background: "#3d2f00", color: "#E5A93C", border: "1px solid #5a4500" }}>T1</span>
              )}
              {d.tier2Qualified && (
                <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 3, background: "#0f2535", color: "#7FC8F8", border: "1px solid #1a3a5f" }}>T2</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Vehicles */}
      {d.vehicles.length > 0 && (
        <>
          <p className="panel-title" style={{ marginBottom: 10 }}>Vehicles</p>
          <div style={{ marginBottom: 24 }}>
            {d.vehicles.map((v, i) => (
              <div key={i} style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "10px 14px", background: "var(--surface)", border: "1px solid var(--border)",
                borderRadius: 6, marginBottom: 6,
              }}>
                <div>
                  <p className="mono" style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", margin: 0 }}>{v.plateNumber}</p>
                  <p style={{ fontSize: 11, color: "var(--text-faint)", margin: "3px 0 0" }}>{v.make} {v.model}</p>
                </div>
                {v.vehicleClass && (
                  <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 3, ...(CLASS_STYLE[v.vehicleClass] ?? {}) }}>{v.vehicleClass}</span>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {/* Trip stats */}
      <p className="panel-title" style={{ marginBottom: 10 }}>Trip History</p>
      <div style={{ marginBottom: 16, padding: "12px 14px", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 6, display: "inline-block" }}>
        <p style={{ fontSize: 22, fontWeight: 700, color: "var(--text)", margin: "0 0 2px" }}>{d.totalTrips}</p>
        <p style={{ fontSize: 11, color: "var(--text-faint)", margin: 0 }}>total completed trips</p>
      </div>

      {d.recentOrders.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          {d.recentOrders.map((o) => (
            <div key={o.id} style={{
              padding: "9px 0", borderBottom: "1px solid var(--border)",
              display: "flex", alignItems: "flex-start", justifyContent: "space-between",
            }}>
              <div>
                <p style={{ fontSize: 12, color: "var(--text)", margin: 0 }}>
                  {o.pickupLocation} → {o.dropoffLocation}
                </p>
                <p style={{ fontSize: 11, color: "var(--text-faint)", margin: "2px 0 0" }}>
                  {fmtDate(o.completedAt)} · {o.operatorName}
                </p>
              </div>
              {o.tripFare != null && (
                <span style={{ fontSize: 12, color: "var(--text-dim)", flexShrink: 0, marginLeft: 12 }}>
                  S${o.tripFare.toFixed(2)}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
