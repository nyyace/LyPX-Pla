"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatTZDate, formatTZTime, DEFAULT_TIMEZONE } from "@/lib/utils/date";
import { NewReservationDrawer } from "./NewReservationDrawer";

type Order = {
  id: string;
  status: string;
  serviceType?: string | null;
  pickupTime: Date;
  pickupLocation: string;
  dropoffLocation: string;
  notes?: string | null;
  account: { id: string; name: string };
  driver?: { id: string; firstName: string; lastName: string } | null;
  vehicle?: { plateNumber: string; make: string; model: string } | null;
};

interface Props {
  orders: Order[];
  tenantId: string;
  timezone?: string;
  currentStatus: string;
}

const STATUS_CHIP: Record<string, { label: string; cls: string }> = {
  booked:    { label: "UNASSIGNED", cls: "chip chip-amber" },
  assigned:  { label: "CONFIRMED",  cls: "chip chip-green" },
  en_route:  { label: "EN ROUTE",   cls: "chip chip-green" },
  arrived:   { label: "ON SCENE",   cls: "chip chip-green" },
  started:   { label: "ACTIVE",     cls: "chip chip-green" },
  completed: { label: "COMPLETED",  cls: "chip chip-dim"   },
  cancelled: { label: "CANCELLED",  cls: "chip chip-red"   },
};

const SERVICE_CHIP: Record<string, { label: string; color: string }> = {
  p2p:              { label: "P2P",      color: "var(--text-faint)" },
  departure:        { label: "DEP",      color: "#60a5fa" },
  arrival_mng:      { label: "ARR MNG",  color: "#a78bfa" },
  arrival_driveway: { label: "ARR DWY",  color: "#818cf8" },
  disposal:         { label: "DISPOSAL", color: "#f59e0b" },
  flexible:         { label: "FLEX",     color: "#34d399" },
};

const STATUS_FILTERS = ["all", "booked", "assigned", "completed", "cancelled"];

export function ReservationsTable({ orders, tenantId, timezone = DEFAULT_TIMEZONE, currentStatus }: Props) {
  const router = useRouter();
  const [showNew, setShowNew] = useState(false);

  return (
    <div style={{ padding: "20px 24px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <span className="panel-title">Reservations</span>
          <p style={{ fontSize: 12, color: "var(--text-faint)", marginTop: 4 }}>
            {orders.length} orders
          </p>
        </div>
        <button className="assign-btn" onClick={() => setShowNew(true)}>
          + New Reservation
        </button>
      </div>

      {/* Status filter tabs */}
      <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
        {STATUS_FILTERS.map(s => (
          <button key={s}
            onClick={() => router.push(`/operator/reservations?status=${s}`)}
            style={{
              background: currentStatus === s ? "var(--accent-dim)" : "var(--surface-raised)",
              border: `1px solid ${currentStatus === s ? "var(--accent)" : "var(--border)"}`,
              borderRadius: 4, color: currentStatus === s ? "var(--accent)" : "var(--text-dim)",
              fontSize: 11, fontWeight: 600, padding: "5px 12px", cursor: "pointer",
              textTransform: "uppercase", letterSpacing: "0.4px",
            }}>
            {s === "all" ? "All" : STATUS_CHIP[s]?.label ?? s}
          </button>
        ))}
      </div>

      {orders.length === 0 ? (
        <div style={{ textAlign: "center", padding: "64px 0", color: "var(--text-faint)", fontSize: 13 }}>
          No reservations found
        </div>
      ) : (
        <table className="grid-table">
          <thead>
            <tr>
              <th>Job Ref</th>
              <th>Type</th>
              <th>Date & Time</th>
              <th>Route</th>
              <th>Account</th>
              <th>Driver</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {orders.map(o => {
              const chip = STATUS_CHIP[o.status] ?? { label: o.status, cls: "chip chip-dim" };
              const svc = o.serviceType ? (SERVICE_CHIP[o.serviceType] ?? { label: o.serviceType, color: "var(--text-faint)" }) : null;
              const isCancelled = o.status === "cancelled";
              return (
                <tr key={o.id} style={isCancelled ? { opacity: 0.45 } : undefined}>
                  <td className="mono" style={{ color: "var(--text-dim)", fontSize: 12 }}>
                    {o.id.slice(0, 12).toUpperCase()}
                  </td>
                  <td>
                    {svc ? (
                      <span style={{
                        fontSize: 10, fontWeight: 700, color: svc.color,
                        border: `1px solid ${svc.color}55`, borderRadius: 3,
                        padding: "2px 6px", letterSpacing: "0.3px",
                      }}>
                        {svc.label}
                      </span>
                    ) : (
                      <span style={{ color: "var(--text-faint)", fontSize: 11 }}>—</span>
                    )}
                  </td>
                  <td>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>
                      {formatTZTime(o.pickupTime, timezone)}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--text-faint)" }}>
                      {formatTZDate(o.pickupTime, timezone)}
                    </div>
                  </td>
                  <td>
                    <div style={{ fontSize: 12, color: "var(--text-dim)" }}>{o.pickupLocation}</div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text)" }}>
                      {o.dropoffLocation ? `→ ${o.dropoffLocation}` : <span style={{ color: "var(--text-faint)", fontSize: 12 }}>No dropoff</span>}
                    </div>
                  </td>
                  <td style={{ fontSize: 13, color: "var(--text)" }}>{o.account.name}</td>
                  <td style={{ fontSize: 13, color: o.driver ? "var(--text)" : "var(--text-faint)" }}>
                    {o.driver ? `${o.driver.firstName} ${o.driver.lastName}` : "Unassigned"}
                  </td>
                  <td><span className={chip.cls}>{chip.label}</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {showNew && (
        <NewReservationDrawer tenantId={tenantId} onClose={() => setShowNew(false)} />
      )}
    </div>
  );
}
