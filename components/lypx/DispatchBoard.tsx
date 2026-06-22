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
  started:   "completed",
};

const STAGE_TOOLTIP = `OTW — On The Way (driver en route to pickup)\nOTS — On The Scene (driver arrived at pickup)\nPOB — Passenger On Board (trip started)\nDONE — Completed`;

function WheelStage({ orderId, status }: { orderId: string; status: string }) {
  const [current, setCurrent] = useState(status);
  const [flash, setFlash] = useState(false);
  const stage = STATUS_STAGE[current] ?? { label: "OTW", pct: 25 };
  const isDone = current === "completed";

  async function advance() {
    const next = STAGE_NEXT[current];
    if (!next) return;
    setFlash(true);
    setTimeout(() => setFlash(false), 400);
    setCurrent(next);
    await fetch(`/api/orders/${orderId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
  }

  return (
    <div title={STAGE_TOOLTIP} style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <div
        className={`wheel${isDone ? " done" : ""}${flash ? " flash" : ""}`}
        style={{ "--pct": `${stage.pct}%` } as React.CSSProperties}
        onClick={advance}
      >
        <span className="wheel-label">{isDone ? "✓" : stage.label}</span>
      </div>
      <span className="mono" style={{ fontSize: 11, color: "var(--text-dim)", width: 60 }}>
        {isDone ? "Completed" : "In progress"}
      </span>
    </div>
  );
}

export function DispatchBoard({ unassigned, active, tenants = [], isAdmin = false, timezone = DEFAULT_TIMEZONE }: Props) {
  const [assigningOrder, setAssigningOrder] = useState<Order | null>(null);
  const [tenantFilter, setTenantFilter] = useState<string>("all");

  const filteredUnassigned = tenantFilter === "all"
    ? unassigned
    : unassigned.filter(o => o.tenant.id === tenantFilter);
  const filteredActive = tenantFilter === "all"
    ? active
    : active.filter(o => o.tenant.id === tenantFilter);

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
            No unassigned bookings
          </div>
        )}

        {filteredUnassigned.map(order => {
          const vehicleClass = order.vehicle ? "AVF" : "NVE";
          return (
            <div key={order.id} className="booking-card unassigned">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                <span className="mono" style={{ fontSize: 15, fontWeight: 600, color: "var(--text)" }}>
                  {formatTZTime(order.pickupTime, timezone)}
                </span>
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
                <th>Status</th>
                <th>ETA</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filteredActive.map(order => {
                const hasDriver = !!order.driver;
                const stage = STATUS_STAGE[order.status] ?? STATUS_STAGE.assigned;
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
                    <td>
                      <WheelStage orderId={order.id} status={order.status} />
                    </td>
                    <td className="mono" style={{ color: "var(--text-dim)", fontSize: 12 }}>
                      {order.status === "completed" ? "Arrived" : "—"}
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
