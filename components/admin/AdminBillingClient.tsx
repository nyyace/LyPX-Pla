"use client";

import { useState, useMemo } from "react";

export type BillingRow = {
  id:                  string;
  jobReference:        string;
  completedAt:         string | null;
  pickupTime:          string;
  accountName:         string;
  accountType:         string;
  fareAmount:          number | null;
  fareCurrency:        string;
  fareNote:            string | null;
  driverPayableAmount: number | null;
};

const ACCOUNT_TYPE_LABEL: Record<string, string> = {
  individual:       "LyPX Direct",
  business_entity:  "Partner",
};

const TYPE_CHIP: Record<string, React.CSSProperties> = {
  individual:      { background: "#0d2e30", color: "#4eb8c9", border: "1px solid #1a4a55" },
  business_entity: { background: "#2d1a5a", color: "#c4b5fd", border: "1px solid #4B2D8F" },
};

function fmtCurrency(amount: number | null, currency = "SGD") {
  if (amount == null) return "—";
  return `${currency} ${amount.toFixed(2)}`;
}

function fmtDate(iso: string | null, tz: string) {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("en-SG", {
    timeZone: tz,
    day: "2-digit", month: "short", year: "numeric",
  }).format(new Date(iso));
}

function toDateInputValue(iso: string | null, tz: string): string {
  if (!iso) return "";
  const d = new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(iso));
  return d; // en-CA produces YYYY-MM-DD
}

function startOfMonthISO(): string {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

interface Props {
  rows:     BillingRow[];
  timezone: string;
}

export function AdminBillingClient({ rows, timezone }: Props) {
  const [dateFrom,   setDateFrom]   = useState(startOfMonthISO());
  const [dateTo,     setDateTo]     = useState(todayISO());
  const [typeFilter, setTypeFilter] = useState<"all" | "individual" | "business_entity">("all");
  const [search,     setSearch]     = useState("");

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return rows.filter((r) => {
      if (typeFilter !== "all" && r.accountType !== typeFilter) return false;

      const dateStr = toDateInputValue(r.completedAt ?? r.pickupTime, timezone);
      if (dateFrom && dateStr < dateFrom) return false;
      if (dateTo   && dateStr > dateTo)   return false;

      if (q && !r.accountName.toLowerCase().includes(q) && !r.jobReference.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [rows, typeFilter, dateFrom, dateTo, search, timezone]);

  const totalFare = filtered.reduce((s, r) => s + (r.fareAmount ?? 0), 0);
  const totalCost = filtered.reduce((s, r) => s + (r.driverPayableAmount ?? 0), 0);
  const totalMargin = totalFare - totalCost;
  const hasFare = filtered.some((r) => r.fareAmount != null);

  const statBox: React.CSSProperties = {
    background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, padding: "14px 18px",
  };
  const statLabel: React.CSSProperties = {
    fontSize: 10, color: "var(--text-faint)", textTransform: "uppercase", letterSpacing: "0.7px", fontWeight: 700, marginBottom: 6,
  };
  const statValue: React.CSSProperties = {
    fontSize: 22, fontWeight: 600, fontFamily: "monospace",
  };

  const filterBtn = (active: boolean): React.CSSProperties => ({
    fontSize: 12, fontWeight: active ? 600 : 400, padding: "5px 12px",
    background: active ? "var(--accent)" : "var(--surface-raised)",
    color: active ? "#000" : "var(--text-dim)",
    border: `1px solid ${active ? "var(--accent)" : "var(--border)"}`,
    borderRadius: 4, cursor: "pointer",
  });

  return (
    <div style={{ padding: "20px 24px" }}>
      <h1 style={{ fontSize: 18, fontWeight: 700, color: "var(--text)", marginBottom: 20 }}>Billing</h1>

      {/* ── Filters ─────────────────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
        {/* Date range */}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 12, color: "var(--text-faint)" }}>From</span>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            style={{
              background: "var(--surface-raised)", border: "1px solid var(--border)",
              borderRadius: 4, color: "var(--text)", fontSize: 12, padding: "5px 8px",
            }}
          />
          <span style={{ fontSize: 12, color: "var(--text-faint)" }}>to</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            style={{
              background: "var(--surface-raised)", border: "1px solid var(--border)",
              borderRadius: 4, color: "var(--text)", fontSize: 12, padding: "5px 8px",
            }}
          />
        </div>

        {/* Account type toggle */}
        <div style={{ display: "flex", gap: 4 }}>
          {(["all", "individual", "business_entity"] as const).map((t) => (
            <button key={t} style={filterBtn(typeFilter === t)} onClick={() => setTypeFilter(t)}>
              {t === "all" ? "All Types" : ACCOUNT_TYPE_LABEL[t]}
            </button>
          ))}
        </div>

        {/* Search */}
        <input
          placeholder="Search account or job ref…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            background: "var(--surface-raised)", border: "1px solid var(--border)",
            borderRadius: 4, color: "var(--text)", fontSize: 12, padding: "5px 10px",
            width: 220, outline: "none",
          }}
        />

        <span style={{ fontSize: 12, color: "var(--text-faint)", marginLeft: "auto" }}>
          {filtered.length} trip{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* ── Summary strip ───────────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 28 }}>
        <div style={statBox}>
          <p style={statLabel}>Total Fare Collected</p>
          <p className="mono" style={{ ...statValue, color: hasFare ? "var(--text)" : "var(--text-faint)" }}>
            {hasFare ? `SGD ${totalFare.toFixed(2)}` : "—"}
          </p>
          <p style={{ fontSize: 10, color: "var(--text-faint)", marginTop: 4 }}>sell price</p>
        </div>
        <div style={statBox}>
          <p style={statLabel}>Total Driver Payable</p>
          <p className="mono" style={{ ...statValue, color: "var(--text)" }}>
            {filtered.some((r) => r.driverPayableAmount != null)
              ? `SGD ${totalCost.toFixed(2)}`
              : "—"}
          </p>
          <p style={{ fontSize: 10, color: "var(--text-faint)", marginTop: 4 }}>cost</p>
        </div>
        <div style={statBox}>
          <p style={statLabel}>Total Margin</p>
          <p className="mono" style={{
            ...statValue,
            color: totalMargin > 0 ? "#4CAF6D" : totalMargin < 0 ? "#D9534F" : "var(--text-faint)",
          }}>
            {hasFare ? `SGD ${totalMargin.toFixed(2)}` : "—"}
          </p>
          <p style={{ fontSize: 10, color: "var(--text-faint)", marginTop: 4 }}>fare − driver payable</p>
        </div>
        <div style={statBox}>
          <p style={statLabel}>Trips</p>
          <p className="mono" style={{ ...statValue, color: "var(--text)" }}>{filtered.length}</p>
          <p style={{ fontSize: 10, color: "var(--text-faint)", marginTop: 4 }}>completed in range</p>
        </div>
      </div>

      {/* ── Ledger table ────────────────────────────────────────────── */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "64px 0", color: "var(--text-faint)", fontSize: 13 }}>
          {rows.length === 0 ? "No completed LyPX Direct or Partner trips yet." : "No trips match the current filters."}
        </div>
      ) : (
        <table className="grid-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Job Ref</th>
              <th>Account</th>
              <th>Type</th>
              <th>Fare (SGD)</th>
              <th>Driver Payable</th>
              <th>Margin</th>
              <th>Note</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => {
              const margin = r.fareAmount != null && r.driverPayableAmount != null
                ? r.fareAmount - r.driverPayableAmount
                : null;
              return (
                <tr key={r.id}>
                  <td style={{ fontSize: 12, color: "var(--text-dim)" }}>
                    {fmtDate(r.completedAt ?? r.pickupTime, timezone)}
                  </td>
                  <td className="mono" style={{ fontSize: 12, color: "var(--text-dim)" }}>
                    {r.jobReference}
                  </td>
                  <td style={{ fontSize: 13, color: "var(--text)" }}>{r.accountName}</td>
                  <td>
                    <span style={{
                      fontSize: 9, fontWeight: 700, padding: "1px 6px", borderRadius: 3,
                      ...(TYPE_CHIP[r.accountType] ?? {}),
                    }}>
                      {ACCOUNT_TYPE_LABEL[r.accountType] ?? r.accountType}
                    </span>
                  </td>
                  <td className="mono" style={{ fontSize: 13, color: r.fareAmount != null ? "var(--text)" : "var(--text-faint)" }}>
                    {fmtCurrency(r.fareAmount, r.fareCurrency)}
                  </td>
                  <td className="mono" style={{ fontSize: 13, color: r.driverPayableAmount != null ? "var(--text)" : "var(--text-faint)" }}>
                    {fmtCurrency(r.driverPayableAmount, r.fareCurrency)}
                  </td>
                  <td className="mono" style={{
                    fontSize: 13,
                    color: margin == null ? "var(--text-faint)" : margin >= 0 ? "#4CAF6D" : "#D9534F",
                  }}>
                    {margin == null ? "—" : `${margin >= 0 ? "+" : ""}${margin.toFixed(2)}`}
                  </td>
                  <td style={{ fontSize: 12, color: "var(--text-faint)" }}>{r.fareNote ?? "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
