"use client";

import { useState, useCallback } from "react";
import { formatTZTime, formatTZDate, DEFAULT_TIMEZONE } from "@/lib/utils/date";
import { AssignModal } from "./AssignModal";
import { WaIcon } from "./WaIcon";

type Order = {
  id: string;
  status: string;
  pickupTime: Date;
  pickupLocation: string;
  dropoffLocation: string;
  notes?: string | null;
  fareAmount?: number | null;
  fareCurrency?: string | null;
  account: { name: string };
  driver?: { id: string; firstName: string; lastName: string } | null;
  vehicle?: { plateNumber: string; make: string; model: string } | null;
  tenant: { id: string; name: string };
};

type Tenant = { id: string; name: string };

interface Props {
  unassigned: Order[];
  active: Order[];
  tenants?: Tenant[];
  isAdmin?: boolean;
  timezone?: string;
}

const STATUS_STAGE: Record<string, { label: string; pct: number }> = {
  booked:    { label: "—",    pct: 0  },
  assigned:  { label: "OTW",  pct: 25 },
  en_route:  { label: "OTW",  pct: 25 },
  arrived:   { label: "OTS",  pct: 50 },
  started:   { label: "POB",  pct: 75 },
  completed: { label: "DONE", pct: 100 },
};

const STAGE_NEXT: Record<string, string> = {
  assigned:  "en_route",
  en_route:  "arrived",
  arrived:   "started",
};

const STAGE_TOOLTIP = `OTW — On The Way (driver en route to pickup)\nOTS — On The Scene (driver arrived at pickup)\nPOB — Passenger On Board (trip started)\nDONE — Completed`;

// Imminence: minutes until pickup
function minutesUntil(pickupTime: Date) {
  return Math.floor((new Date(pickupTime).getTime() - Date.now()) / 60000);
}

function imminenceStyle(pickupTime: Date): React.CSSProperties {
  const mins = minutesUntil(pickupTime);
  if (mins <= 30 && mins >= 0) {
    return { border: "2px solid #ef4444", animation: "pulse-red 1.5s ease-in-out infinite" };
  }
  if (mins <= 120 && mins >= 0) {
    return { border: "2px solid #f59e0b", animation: "pulse-amber 2s ease-in-out infinite" };
  }
  return {};
}

function TodayChip({ pickupTime }: { pickupTime: Date }) {
  const mins = minutesUntil(pickupTime);
  if (mins <= 0) return <span style={{ fontSize: 9, fontWeight: 700, color: "#ef4444", background: "rgba(239,68,68,0.15)", padding: "2px 6px", borderRadius: 3 }}>NOW</span>;
  if (mins <= 30) return <span style={{ fontSize: 9, fontWeight: 700, color: "#ef4444", background: "rgba(239,68,68,0.15)", padding: "2px 6px", borderRadius: 3 }}>{mins}m</span>;
  if (mins <= 120) return <span style={{ fontSize: 9, fontWeight: 700, color: "#f59e0b", background: "rgba(245,158,11,0.15)", padding: "2px 6px", borderRadius: 3 }}>{mins}m</span>;
  return <span style={{ fontSize: 9, fontWeight: 700, color: "var(--text-faint)", background: "var(--surface-raised)", padding: "2px 6px", borderRadius: 3 }}>TODAY</span>;
}

function WheelStage({
  orderId, status, fareAmount, fareCurrency, onCompleted, onCancelled,
}: {
  orderId: string;
  status: string;
  fareAmount?: number | null;
  fareCurrency?: string | null;
  onCompleted: (id: string) => void;
  onCancelled: (id: string) => void;
}) {
  const [current, setCurrent] = useState(status);
  const [flash, setFlash] = useState(false);
  const [showComplete, setShowComplete] = useState(false);
  const [showCancel, setShowCancel] = useState(false);
  const [fare, setFare] = useState(fareAmount?.toString() ?? "");
  const [fareNote, setFareNote] = useState("");
  const [cancelReason, setCancelReason] = useState("");
  const [saving, setSaving] = useState(false);
  const stage = STATUS_STAGE[current] ?? STATUS_STAGE.assigned;
  const isDone = current === "completed";
  const isCancelled = current === "cancelled";

  async function advance() {
    const next = STAGE_NEXT[current];
    if (!next) {
      // "started" → show completion drawer
      if (current === "started") setShowComplete(true);
      return;
    }
    setFlash(true);
    setTimeout(() => setFlash(false), 400);
    setCurrent(next);
    await fetch(`/api/orders/${orderId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
  }

  async function confirmComplete() {
    if (!fare || isNaN(parseFloat(fare)) || parseFloat(fare) <= 0) return;
    setSaving(true);
    await fetch(`/api/orders/${orderId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: "completed",
        fareAmount: parseFloat(fare),
        fareCurrency: fareCurrency ?? "SGD",
        fareNote: fareNote || null,
      }),
    });
    setSaving(false);
    setCurrent("completed");
    setShowComplete(false);
    onCompleted(orderId);
  }

  async function confirmCancel() {
    if (!cancelReason.trim()) return;
    setSaving(true);
    await fetch(`/api/orders/${orderId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "cancelled", cancellationReason: cancelReason }),
    });
    setSaving(false);
    setCurrent("cancelled");
    setShowCancel(false);
    onCancelled(orderId);
  }

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "7px 10px", borderRadius: 6, border: "1px solid var(--border)",
    background: "var(--surface)", color: "var(--text)", fontSize: 13, boxSizing: "border-box",
  };

  if (isCancelled) {
    return <span style={{ fontSize: 11, color: "#ef4444" }}>Cancelled</span>;
  }

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div
          title={STAGE_TOOLTIP}
          className={`wheel${isDone ? " done" : ""}${flash ? " flash" : ""}`}
          style={{ "--pct": `${stage.pct}%` } as React.CSSProperties}
          onClick={advance}
        >
          <span className="wheel-label">{isDone ? "✓" : current === "started" ? "▶" : stage.label}</span>
        </div>
        <span className="mono" style={{ fontSize: 11, color: "var(--text-dim)", width: 60 }}>
          {isDone ? "Done" : "Live"}
        </span>
        {!isDone && (
          <button
            onClick={() => setShowCancel(true)}
            style={{
              fontSize: 10, color: "#ef4444", background: "none", border: "1px solid rgba(239,68,68,0.3)",
              borderRadius: 4, padding: "2px 6px", cursor: "pointer",
            }}
            title="Cancel trip"
          >
            ✕
          </button>
        )}
      </div>

      {/* Completion drawer */}
      {showComplete && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 1100,
          display: "flex", alignItems: "center", justifyContent: "center",
        }} onClick={() => setShowComplete(false)}>
          <div style={{
            background: "var(--surface)", borderRadius: 10, padding: 24, width: 360,
            boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
          }} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 700 }}>Confirm Trip Completion</h3>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 11, color: "var(--text-dim)", fontWeight: 600, display: "block", marginBottom: 4 }}>
                Final Fare (SGD) *
              </label>
              <input
                type="number" min={0} step="0.01"
                value={fare} onChange={e => setFare(e.target.value)}
                style={inputStyle} placeholder="e.g. 120.00" autoFocus
              />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 11, color: "var(--text-dim)", fontWeight: 600, display: "block", marginBottom: 4 }}>
                Note (optional)
              </label>
              <input
                type="text" value={fareNote} onChange={e => setFareNote(e.target.value)}
                style={inputStyle} placeholder="e.g. Surge applied"
              />
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button onClick={() => setShowComplete(false)} style={{
                padding: "8px 16px", borderRadius: 6, border: "1px solid var(--border)",
                background: "none", color: "var(--text-dim)", fontSize: 12, cursor: "pointer",
              }}>
                Back
              </button>
              <button
                onClick={confirmComplete}
                disabled={saving || !fare || isNaN(parseFloat(fare)) || parseFloat(fare) <= 0}
                style={{
                  padding: "8px 16px", borderRadius: 6, border: "none",
                  background: "#22c55e", color: "#fff", fontSize: 12, fontWeight: 700,
                  cursor: "pointer", opacity: saving ? 0.6 : 1,
                }}
              >
                {saving ? "Saving…" : "Mark Completed"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel modal */}
      {showCancel && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 1100,
          display: "flex", alignItems: "center", justifyContent: "center",
        }} onClick={() => setShowCancel(false)}>
          <div style={{
            background: "var(--surface)", borderRadius: 10, padding: 24, width: 360,
            boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
          }} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: "0 0 4px", fontSize: 16, fontWeight: 700, color: "#ef4444" }}>Cancel Trip</h3>
            <p style={{ fontSize: 12, color: "var(--text-dim)", margin: "0 0 16px" }}>
              This cannot be undone. Please provide a reason.
            </p>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 11, color: "var(--text-dim)", fontWeight: 600, display: "block", marginBottom: 4 }}>
                Cancellation Reason *
              </label>
              <textarea
                value={cancelReason}
                onChange={e => setCancelReason(e.target.value)}
                style={{ ...inputStyle, resize: "vertical" }}
                rows={3}
                placeholder="e.g. Client cancelled — changed plans"
                autoFocus
              />
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button onClick={() => setShowCancel(false)} style={{
                padding: "8px 16px", borderRadius: 6, border: "1px solid var(--border)",
                background: "none", color: "var(--text-dim)", fontSize: 12, cursor: "pointer",
              }}>
                Back
              </button>
              <button
                onClick={confirmCancel}
                disabled={saving || !cancelReason.trim()}
                style={{
                  padding: "8px 16px", borderRadius: 6, border: "none",
                  background: "#ef4444", color: "#fff", fontSize: 12, fontWeight: 700,
                  cursor: "pointer", opacity: saving || !cancelReason.trim() ? 0.5 : 1,
                }}
              >
                {saving ? "Cancelling…" : "Cancel Trip"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export function DispatchBoard({ unassigned, active, tenants = [], isAdmin = false, timezone = DEFAULT_TIMEZONE }: Props) {
  const [assigningOrder, setAssigningOrder] = useState<Order | null>(null);
  const [tenantFilter, setTenantFilter] = useState<string>("all");
  const [removedIds, setRemovedIds] = useState<Set<string>>(new Set());

  const removeOrder = useCallback((id: string) => {
    setRemovedIds(prev => new Set([...prev, id]));
  }, []);

  const filteredUnassigned = (tenantFilter === "all" ? unassigned : unassigned.filter(o => o.tenant.id === tenantFilter))
    .filter(o => !removedIds.has(o.id));
  const filteredActive = (tenantFilter === "all" ? active : active.filter(o => o.tenant.id === tenantFilter))
    .filter(o => !removedIds.has(o.id));

  const today = new Intl.DateTimeFormat("en-SG", {
    day: "2-digit", month: "short", year: "numeric", timeZone: timezone,
  }).format(new Date()).toUpperCase();

  return (
    <div style={{ display: "grid", gridTemplateColumns: "25% 75%", height: "100%" }}>
      {/* LEFT: Unassigned queue */}
      <div style={{ borderRight: "1px solid var(--border)", padding: 20, overflowY: "auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
          <span className="panel-title">New Bookings</span>
          <span className="count-badge">{filteredUnassigned.length}</span>
        </div>

        {isAdmin && tenants.length > 0 && (
          <select
            value={tenantFilter}
            onChange={e => setTenantFilter(e.target.value)}
            style={{
              width: "100%", marginBottom: 14, background: "var(--surface)", border: "1px solid var(--border)",
              borderRadius: 4, color: "var(--text-dim)", fontSize: 12, padding: "5px 8px",
            }}
          >
            <option value="all">All Operators</option>
            {tenants.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        )}

        {filteredUnassigned.length === 0 && (
          <div style={{ textAlign: "center", padding: "32px 0", color: "var(--text-faint)", fontSize: 12 }}>
            No unassigned bookings today
          </div>
        )}

        {filteredUnassigned.map(order => {
          const vehicleClass = (order as { vehicleClass?: string }).vehicleClass ?? "AVF";
          const extraStyle = imminenceStyle(order.pickupTime);
          return (
            <div
              key={order.id}
              className="booking-card unassigned"
              style={{ ...extraStyle, marginBottom: 12 }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span className="mono" style={{ fontSize: 15, fontWeight: 600, color: "var(--text)" }}>
                    {formatTZTime(order.pickupTime, timezone)}
                  </span>
                  <TodayChip pickupTime={order.pickupTime} />
                </div>
                <span className={`tier-chip tier-${vehicleClass}`}>{vehicleClass}</span>
              </div>
              <div style={{ fontSize: 12.5, color: "var(--text-dim)", lineHeight: 1.5, marginBottom: 12 }}>
                {order.pickupLocation}<br />
                <span style={{ color: "var(--text)" }}>→ {order.dropoffLocation}</span>
              </div>
              {isAdmin && (
                <div style={{ fontSize: 11, color: "var(--text-faint)", marginBottom: 8 }}>
                  {order.tenant.name}
                </div>
              )}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: 11, color: "var(--text-faint)" }}>
                  {order.account.name}
                  {order.fareAmount != null && (
                    <span style={{ marginLeft: 6, color: "var(--text-dim)" }}>
                      {order.fareCurrency ?? "SGD"} {order.fareAmount.toFixed(2)}
                    </span>
                  )}
                </span>
                <button className="assign-btn" onClick={() => setAssigningOrder(order)}>
                  ASSIGN
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* RIGHT: Active trips grid */}
      <div style={{ padding: "20px 24px", overflowY: "auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span className="panel-title">Active Trips — Today</span>
            <span title={STAGE_TOOLTIP} style={{
              width: 16, height: 16, borderRadius: "50%", border: "1px solid var(--border)",
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              fontSize: 9, color: "var(--text-faint)", cursor: "help", flexShrink: 0,
            }}>?</span>
          </div>
          <span className="mono" style={{
            fontSize: 11, background: "var(--surface-raised)", color: "var(--text-dim)",
            border: "1px solid var(--border)", padding: "2px 8px", borderRadius: 4,
          }}>
            {today}
          </span>
        </div>

        {filteredActive.length === 0 ? (
          <div style={{ textAlign: "center", padding: "64px 0", color: "var(--text-faint)", fontSize: 13 }}>
            No active trips
          </div>
        ) : (
          <table className="grid-table">
            <thead>
              <tr>
                <th>Job Ref</th>
                <th>Pickup</th>
                <th>Route</th>
                {isAdmin && <th>Operator</th>}
                <th>Driver</th>
                <th>Fare</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filteredActive.map(order => {
                const hasDriver = !!order.driver;
                return (
                  <tr key={order.id}>
                    <td className="mono" style={{ color: "var(--text-dim)", fontSize: 12 }}>
                      {order.id.slice(0, 12).toUpperCase()}
                    </td>
                    <td className="mono" style={{ fontWeight: 600, fontSize: 14 }}>
                      {formatTZTime(order.pickupTime, timezone)}
                    </td>
                    <td>
                      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                        <span style={{ color: "var(--text-dim)", fontSize: 12 }}>{order.pickupLocation}</span>
                        <span style={{ color: "var(--text)", fontSize: 13, fontWeight: 500 }}>→ {order.dropoffLocation}</span>
                      </div>
                    </td>
                    {isAdmin && (
                      <td style={{ fontSize: 12, color: "var(--text-faint)" }}>{order.tenant.name}</td>
                    )}
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{
                          width: 6, height: 6, borderRadius: "50%", flexShrink: 0,
                          background: hasDriver ? "var(--green)" : "var(--text-faint)",
                        }} />
                        <span style={{ color: hasDriver ? "var(--text)" : "var(--text-faint)", fontSize: 12.5 }}>
                          {hasDriver ? `${order.driver!.firstName} ${order.driver!.lastName}` : "—"}
                        </span>
                      </div>
                    </td>
                    <td className="mono" style={{ fontSize: 12, color: order.fareAmount != null ? "var(--text)" : "var(--text-faint)" }}>
                      {order.fareAmount != null ? `${order.fareCurrency ?? "SGD"} ${order.fareAmount.toFixed(2)}` : "—"}
                    </td>
                    <td>
                      <WheelStage
                        orderId={order.id}
                        status={order.status}
                        fareAmount={order.fareAmount}
                        fareCurrency={order.fareCurrency}
                        onCompleted={removeOrder}
                        onCancelled={removeOrder}
                      />
                    </td>
                    <td>
                      <WaIcon driverId={order.driver?.id} phone={undefined} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {assigningOrder && (
        <AssignModal
          order={assigningOrder}
          tenantId={assigningOrder.tenant.id}
          onClose={() => setAssigningOrder(null)}
        />
      )}
    </div>
  );
}
