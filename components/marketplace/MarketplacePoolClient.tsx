"use client";

import { useState, useEffect, useCallback } from "react";

type Driver = {
  driverId: string;
  firstName: string;
  lastName: string;
  tier: "T1" | "T2" | "T3";
  complianceStatus: string;
  vehicle: { plate: string; make: string; model: string; class: string | null } | null;
  availability: "available" | "on_job" | "suspended";
  currentJobRef: string | null;
  estimatedFreeAt: string | null;
};

type Operator = {
  tenantId: string;
  name: string;
  driverCount: number;
  availableCount: number;
  drivers: Driver[];
};

type Summary = {
  totalParticipatingOperators: number;
  totalDrivers: number;
  availableDrivers: number;
  onJobDrivers: number;
  suspendedDrivers: number;
};

type PoolData = { operators: Operator[]; summary: Summary };

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-SG", { timeZone: "Asia/Singapore", hour: "2-digit", minute: "2-digit" });
}

function StatusDot({ status }: { status: "available" | "on_job" | "suspended" }) {
  const colors = { available: "#22c55e", on_job: "#f59e0b", suspended: "#ef4444" };
  return <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: colors[status], marginRight: 6 }} />;
}

function TierChip({ tier }: { tier: "T1" | "T2" | "T3" }) {
  const styles: Record<string, React.CSSProperties> = {
    T1: { background: "#E5A93C22", color: "#E5A93C", border: "1px solid #E5A93C44" },
    T2: { background: "#3b82f622", color: "#60a5fa", border: "1px solid #3b82f644" },
    T3: { background: "var(--surface-raised)", color: "var(--text-dim)", border: "1px solid var(--border)" },
  };
  return <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 3, letterSpacing: "0.3px", ...styles[tier] }}>{tier}</span>;
}

function ClassChip({ cls }: { cls: string | null }) {
  if (!cls) return <span style={{ color: "var(--text-faint)", fontSize: 12 }}>—</span>;
  const styles: Record<string, React.CSSProperties> = {
    VVV: { background: "#7c3aed22", color: "#a78bfa", border: "1px solid #7c3aed44" },
    AVF: { background: "#1d4ed822", color: "#60a5fa", border: "1px solid #1d4ed844" },
    NVE: { background: "#06652222", color: "#4ade80", border: "1px solid #06652244" },
  };
  return <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 3, letterSpacing: "0.3px", ...(styles[cls] ?? {}) }}>{cls}</span>;
}

function StatBox({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, padding: "14px 20px", minWidth: 140 }}>
      <div style={{ fontSize: 22, fontWeight: 700, color: color ?? "var(--text)", fontVariantNumeric: "tabular-nums" }}>{value}</div>
      <div style={{ fontSize: 11, color: "var(--text-faint)", marginTop: 2 }}>{label}</div>
    </div>
  );
}

export function MarketplacePoolClient({ initialData }: { initialData: PoolData }) {
  const [data, setData] = useState<PoolData>(initialData);
  const [lastRefreshed, setLastRefreshed] = useState(new Date());
  const [filterOp, setFilterOp] = useState("all");
  const [filterClass, setFilterClass] = useState("all");
  const [availableOnly, setAvailableOnly] = useState(false);

  const fetchPool = useCallback(async () => {
    const params = new URLSearchParams();
    if (filterOp !== "all") params.set("operatorId", filterOp);
    if (filterClass !== "all") params.set("vehicleClass", filterClass);
    const res = await fetch(`/api/admin/marketplace/pool?${params}`);
    if (res.ok) {
      setData(await res.json());
      setLastRefreshed(new Date());
    }
  }, [filterOp, filterClass]);

  useEffect(() => { fetchPool(); }, [fetchPool]);

  useEffect(() => {
    const timer = setInterval(() => { fetchPool(); }, 30_000);
    return () => clearInterval(timer);
  }, [fetchPool]);

  const colStyle: React.CSSProperties = { padding: "10px 12px", fontSize: 13, color: "var(--text)" };
  const thStyle: React.CSSProperties = { ...colStyle, color: "var(--text-faint)", fontWeight: 500, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.5px", borderBottom: "1px solid var(--border)" };

  const allOperators = initialData.operators;

  const visibleOperators = data.operators.map((op) => ({
    ...op,
    drivers: op.drivers.filter((d) => !availableOnly || d.availability === "available"),
  })).filter((op) => op.drivers.length > 0 || !availableOnly);

  return (
    <div style={{ padding: "32px 40px" }}>
      {/* Summary strip */}
      <div style={{ display: "flex", gap: 12, marginBottom: 28, flexWrap: "wrap" }}>
        <StatBox label="Participating Operators" value={data.summary.totalParticipatingOperators} />
        <StatBox label="Total Drivers" value={data.summary.totalDrivers} />
        <StatBox label="Available Now" value={data.summary.availableDrivers} color="#22c55e" />
        <StatBox label="On Job" value={data.summary.onJobDrivers} color="#f59e0b" />
      </div>

      {/* Filter bar */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
        <select value={filterOp} onChange={(e) => setFilterOp(e.target.value)}
          style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 6, padding: "7px 12px", fontSize: 13, color: "var(--text)", cursor: "pointer" }}>
          <option value="all">All Operators</option>
          {allOperators.map((op) => <option key={op.tenantId} value={op.tenantId}>{op.name}</option>)}
        </select>

        <select value={filterClass} onChange={(e) => setFilterClass(e.target.value)}
          style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 6, padding: "7px 12px", fontSize: 13, color: "var(--text)", cursor: "pointer" }}>
          <option value="all">All Vehicle Classes</option>
          <option value="VVV">VVV</option>
          <option value="AVF">AVF</option>
          <option value="NVE">NVE</option>
        </select>

        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--text)", cursor: "pointer" }}>
          <input type="checkbox" checked={availableOnly} onChange={(e) => setAvailableOnly(e.target.checked)} style={{ width: 15, height: 15 }} />
          Available Only
        </label>

        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 11, color: "var(--text-faint)" }}>
            Last refreshed: {fmtTime(lastRefreshed.toISOString())} SGT
          </span>
          <button onClick={fetchPool}
            style={{ fontSize: 12, color: "var(--gold)", background: "none", border: "1px solid var(--gold)44", borderRadius: 4, padding: "5px 10px", cursor: "pointer" }}>
            ↻ Refresh
          </button>
        </div>
      </div>

      {/* Empty state */}
      {visibleOperators.length === 0 && (
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, padding: "40px", textAlign: "center" }}>
          <p style={{ fontSize: 14, color: "var(--text-dim)", marginBottom: 6 }}>
            {data.summary.totalParticipatingOperators === 0
              ? "No operators have enabled marketplace participation."
              : "No drivers match the current filters."}
          </p>
          {data.summary.totalParticipatingOperators === 0 && (
            <p style={{ fontSize: 12, color: "var(--text-faint)" }}>
              Operators can enable this in their Console → Settings → Marketplace Participation.
            </p>
          )}
        </div>
      )}

      {/* Per-operator sections */}
      {visibleOperators.map((op) => (
        <div key={op.tenantId} style={{ marginBottom: 32 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", textTransform: "uppercase", letterSpacing: "0.4px" }}>{op.name}</span>
            <span style={{ fontSize: 12, color: "var(--text-dim)" }}>{op.driverCount} driver{op.driverCount !== 1 ? "s" : ""} · <span style={{ color: "#22c55e" }}>{op.availableCount} available</span></span>
          </div>
          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={{ ...thStyle, textAlign: "left" }}>Driver</th>
                  <th style={{ ...thStyle, textAlign: "left" }}>Tier</th>
                  <th style={{ ...thStyle, textAlign: "left" }}>Vehicle</th>
                  <th style={{ ...thStyle, textAlign: "left" }}>Class</th>
                  <th style={{ ...thStyle, textAlign: "left" }}>Status</th>
                  <th style={{ ...thStyle, textAlign: "left" }}>Job</th>
                </tr>
              </thead>
              <tbody>
                {op.drivers.map((d, i) => (
                  <tr key={d.driverId}
                    style={{ borderTop: i === 0 ? undefined : "1px solid var(--border)", opacity: d.availability === "suspended" ? 0.4 : 1 }}>
                    <td style={colStyle}>{d.firstName} {d.lastName}</td>
                    <td style={colStyle}><TierChip tier={d.tier} /></td>
                    <td style={{ ...colStyle, fontFamily: "monospace", fontSize: 12 }}>
                      {d.vehicle ? `${d.vehicle.plate} · ${d.vehicle.make} ${d.vehicle.model}` : "—"}
                    </td>
                    <td style={colStyle}><ClassChip cls={d.vehicle?.class ?? null} /></td>
                    <td style={colStyle}>
                      <StatusDot status={d.availability} />
                      <span style={{ fontSize: 12, color: d.availability === "available" ? "#22c55e" : d.availability === "on_job" ? "#f59e0b" : "#ef4444" }}>
                        {d.availability === "available" ? "Available" : d.availability === "on_job" ? "On Job" : "Suspended"}
                      </span>
                    </td>
                    <td style={{ ...colStyle, fontSize: 12, color: "var(--text-dim)" }}>
                      {d.currentJobRef
                        ? <>{d.currentJobRef}{d.estimatedFreeAt ? <span style={{ color: "var(--text-faint)" }}> (~{fmtTime(d.estimatedFreeAt)})</span> : null}</>
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}
