"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface Driver {
  id: string;
  firstName: string;
  lastName: string;
  tier2Qualified: boolean;
  complianceStatus: string;
  vehicleOwnerships: { vehicle: { plateNumber: string; make: string; model: string } }[];
}

interface Props {
  order: {
    id: string;
    pickupTime: Date;
    pickupLocation: string;
    dropoffLocation: string;
    passengerWhatsapp?: string | null;
    sameAsRequestor?: boolean;
  };
  tenantId: string;
  onClose: () => void;
}

export function AssignModal({ order, tenantId, onClose }: Props) {
  const router = useRouter();
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [selected, setSelected] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [assignError, setAssignError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/operators/${tenantId}/drivers?compliant=true`)
      .then(r => r.json())
      .then(d => { setDrivers(d.drivers ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [tenantId]);

  async function assign() {
    if (!selected) return;
    setSaving(true);
    setAssignError(null);
    const res = await fetch(`/api/orders/${order.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ driverId: selected, status: "assigned" }),
    });
    setSaving(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setAssignError(d.error ?? "Failed to assign driver — they may not meet compliance requirements.");
      return;
    }
    onClose();
    router.refresh();
  }

  const time = new Date(order.pickupTime).toLocaleTimeString("en-SG", {
    hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Singapore",
  });

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000,
    }} onClick={onClose}>
      <div style={{
        background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8,
        padding: 24, width: 440, maxHeight: "70vh", display: "flex", flexDirection: "column",
      }} onClick={e => e.stopPropagation()}>

        <div style={{ marginBottom: 16 }}>
          <p className="panel-title" style={{ marginBottom: 4 }}>Assign Driver</p>
          <p style={{ fontSize: 13, color: "var(--text-dim)" }}>
            {time} · {order.pickupLocation} → {order.dropoffLocation}
          </p>
        </div>

        {assignError && (
          <div style={{
            background: "rgba(217,83,79,0.12)", border: "1px solid rgba(217,83,79,0.25)",
            borderRadius: 4, padding: "8px 12px", color: "#D9534F", fontSize: 12, marginBottom: 12,
          }}>
            {assignError}
          </div>
        )}

        {!order.sameAsRequestor && !order.passengerWhatsapp && (
          <div style={{
            display: "flex", alignItems: "flex-start", gap: 8,
            background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.25)",
            borderRadius: 6, padding: "8px 12px", marginBottom: 12, fontSize: 12,
            color: "#f59e0b",
          }}>
            <span style={{ flexShrink: 0 }}>⚠</span>
            <span>
              No passenger WhatsApp on this booking. Driver assigned notification will be sent to requestor only.{" "}
              Edit the reservation to add passenger details.
            </span>
          </div>
        )}

        <div style={{ flex: 1, overflowY: "auto", marginBottom: 16 }}>
          {loading ? (
            <p style={{ color: "var(--text-faint)", fontSize: 13, textAlign: "center", padding: "24px 0" }}>
              Loading drivers…
            </p>
          ) : drivers.length === 0 ? (
            <p style={{ color: "var(--text-faint)", fontSize: 13, textAlign: "center", padding: "24px 0" }}>
              No compliant Tier 1 drivers available
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {drivers.map(d => (
                <div
                  key={d.id}
                  onClick={() => setSelected(d.id)}
                  style={{
                    background: selected === d.id ? "var(--accent-dim)" : "var(--surface-raised)",
                    border: `1px solid ${selected === d.id ? "var(--accent)" : "var(--border)"}`,
                    borderRadius: 6, padding: "10px 14px", cursor: "pointer",
                    transition: "border-color 0.15s ease",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div>
                      <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text)" }}>
                        {d.firstName} {d.lastName}
                      </span>
                      {d.tier2Qualified && (
                        <span style={{
                          marginLeft: 8, fontSize: 10, fontWeight: 700, color: "#7FC8F8",
                          border: "1px solid #23384a", borderRadius: 4, padding: "1px 5px",
                        }}>T2</span>
                      )}
                    </div>
                    <span style={{ fontSize: 11, color: "var(--green)" }}>●</span>
                  </div>
                  {d.vehicleOwnerships[0] && (
                    <p className="mono" style={{ fontSize: 11, color: "var(--text-faint)", marginTop: 3 }}>
                      {d.vehicleOwnerships[0].vehicle.plateNumber} ·{" "}
                      {d.vehicleOwnerships[0].vehicle.make} {d.vehicleOwnerships[0].vehicle.model}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{
            background: "none", border: "1px solid var(--border)", borderRadius: 4,
            color: "var(--text-dim)", fontSize: 12, padding: "8px 16px", cursor: "pointer",
          }}>Cancel</button>
          <button onClick={assign} disabled={!selected || saving} style={{
            background: selected ? "var(--accent)" : "var(--surface-raised)",
            border: "none", borderRadius: 4, color: selected ? "#1A1305" : "var(--text-faint)",
            fontSize: 12, fontWeight: 700, padding: "8px 16px", cursor: selected ? "pointer" : "not-allowed",
            transition: "background 0.15s ease",
          }}>
            {saving ? "Assigning…" : "Confirm Assign"}
          </button>
        </div>
      </div>
    </div>
  );
}
