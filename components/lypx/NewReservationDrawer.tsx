"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface Props {
  tenantId: string;
  onClose: () => void;
}

export function NewReservationDrawer({ tenantId, onClose }: Props) {
  const router = useRouter();
  const [accounts, setAccounts] = useState<{ id: string; name: string }[]>([]);
  const [drivers, setDrivers] = useState<{ id: string; firstName: string; lastName: string }[]>([]);
  const [form, setForm] = useState({
    accountId: "", pickupDate: "", pickupTime: "", pickupLocation: "",
    dropoffLocation: "", vehicleClass: "AVF", pax: 1, notes: "", driverId: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/accounts").then(r => r.json()).then(d => setAccounts(Array.isArray(d) ? d : d.accounts ?? []));
    fetch(`/api/operators/${tenantId}/drivers?compliant=true`)
      .then(r => r.json())
      .then(d => setDrivers(d.drivers ?? []));
  }, [tenantId]);

  function set(k: string, v: unknown) {
    setForm(f => ({ ...f, [k]: v }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.accountId || !form.pickupDate || !form.pickupTime || !form.pickupLocation || !form.dropoffLocation) {
      return setError("All required fields must be filled");
    }
    setSaving(true);
    setError(null);
    const pickupTime = new Date(`${form.pickupDate}T${form.pickupTime}:00`);
    const res = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        accountId: form.accountId,
        tenantId,
        pickupTime: pickupTime.toISOString(),
        pickupLocation: form.pickupLocation,
        dropoffLocation: form.dropoffLocation,
        driverId: form.driverId || undefined,
        notes: form.notes || undefined,
        status: form.driverId ? "assigned" : "booked",
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const d = await res.json();
      return setError(d.error ?? "Failed to create reservation");
    }
    router.refresh();
    onClose();
  }

  const inputStyle: React.CSSProperties = {
    width: "100%", background: "var(--surface-raised)", border: "1px solid var(--border)",
    borderRadius: 4, color: "var(--text)", fontSize: 13, padding: "8px 10px",
  };
  const labelStyle: React.CSSProperties = {
    display: "block", fontSize: 11, color: "var(--text-dim)", marginBottom: 4, fontWeight: 500,
    textTransform: "uppercase", letterSpacing: "0.5px",
  };

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 1000,
      display: "flex", alignItems: "flex-start", justifyContent: "flex-end",
    }} onClick={onClose}>
      <div style={{
        background: "var(--surface)", borderLeft: "1px solid var(--border)", height: "100%",
        width: 440, overflow: "auto", padding: 24,
      }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <p className="panel-title">New Reservation</p>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--text-faint)", cursor: "pointer", fontSize: 18 }}>×</button>
        </div>

        {error && (
          <div style={{ background: "rgba(217,83,79,0.12)", border: "1px solid rgba(217,83,79,0.25)", borderRadius: 4, padding: "8px 12px", color: "#D9534F", fontSize: 12, marginBottom: 16 }}>
            {error}
          </div>
        )}

        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={labelStyle}>Account *</label>
            <select value={form.accountId} onChange={e => set("accountId", e.target.value)} style={inputStyle} required>
              <option value="">Select account…</option>
              {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <label style={labelStyle}>Pickup Date *</label>
              <input type="date" value={form.pickupDate} onChange={e => set("pickupDate", e.target.value)} style={inputStyle} required />
            </div>
            <div>
              <label style={labelStyle}>Pickup Time *</label>
              <input type="time" value={form.pickupTime} onChange={e => set("pickupTime", e.target.value)} style={inputStyle} required />
            </div>
          </div>

          <div>
            <label style={labelStyle}>Pickup Location *</label>
            <input type="text" value={form.pickupLocation} onChange={e => set("pickupLocation", e.target.value)} style={inputStyle} placeholder="e.g. Marina Bay Sands" required />
          </div>

          <div>
            <label style={labelStyle}>Dropoff Location *</label>
            <input type="text" value={form.dropoffLocation} onChange={e => set("dropoffLocation", e.target.value)} style={inputStyle} placeholder="e.g. Changi Airport T3" required />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <label style={labelStyle}>Vehicle Class</label>
              <select value={form.vehicleClass} onChange={e => set("vehicleClass", e.target.value)} style={inputStyle}>
                <option value="VVV">VVV — Premium</option>
                <option value="AVF">AVF — Business</option>
                <option value="NVE">NVE — Standard</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>PAX</label>
              <input type="number" min={1} max={20} value={form.pax} onChange={e => set("pax", parseInt(e.target.value))} style={inputStyle} />
            </div>
          </div>

          <div>
            <label style={labelStyle}>Driver (optional)</label>
            <select value={form.driverId} onChange={e => set("driverId", e.target.value)} style={inputStyle}>
              <option value="">Assign later in Dispatch</option>
              {drivers.map(d => <option key={d.id} value={d.id}>{d.firstName} {d.lastName}</option>)}
            </select>
          </div>

          <div>
            <label style={labelStyle}>Notes</label>
            <textarea value={form.notes} onChange={e => set("notes", e.target.value)} style={{ ...inputStyle, resize: "vertical" }} rows={2} placeholder="Any special instructions…" />
          </div>

          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", paddingTop: 8 }}>
            <button type="button" onClick={onClose} style={{
              background: "none", border: "1px solid var(--border)", borderRadius: 4,
              color: "var(--text-dim)", fontSize: 12, padding: "9px 18px", cursor: "pointer",
            }}>Cancel</button>
            <button type="submit" disabled={saving} style={{
              background: "var(--accent)", border: "none", borderRadius: 4,
              color: "#1A1305", fontSize: 12, fontWeight: 700, padding: "9px 18px", cursor: "pointer",
            }}>
              {saving ? "Creating…" : "Create Reservation"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
