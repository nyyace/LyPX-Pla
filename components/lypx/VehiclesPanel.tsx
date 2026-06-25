"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";

type DocumentFile = { fileName: string } | null;
type VehicleDoc = {
  id: string;
  docType: string;
  status: string;
  expiryDate: string | Date;
  file: DocumentFile;
};
type OwnershipDriver = {
  id: string;
  firstName: string;
  lastName: string;
  complianceStatus: string;
};
type VehicleOwnership = {
  id: string;
  driverId: string;
  relationshipType: string;
  contractStatus: string | null;
  contractExpiry: string | Date | null;
  driver: OwnershipDriver;
};
export type Vehicle = {
  id: string;
  plateNumber: string;
  make: string;
  model: string;
  year: number | null;
  colour: string | null;
  seatingCapacity: number | null;
  vehicleClass: string | null;
  insuranceCompany: string | null;
  status: string;
  createdAt: string | Date;
  ownership: VehicleOwnership[];
  documents: VehicleDoc[];
};
type AvailableDriver = {
  id: string;
  firstName: string;
  lastName: string;
  complianceStatus: string;
};

interface Props {
  initialVehicles: Vehicle[];
  availableDrivers: AvailableDriver[];
}

const STATUS_DOT: Record<string, string> = {
  active: "#22c55e",
  inactive: "#6b7280",
  suspended: "#ef4444",
};

const DOC_STATUS_COLOUR: Record<string, string> = {
  verified: "#22c55e",
  pending_review: "#f59e0b",
  rejected: "#ef4444",
  expired: "#ef4444",
};

const VEHICLE_CLASSES = ["VVV", "AVF", "NVE"];
const DOC_TYPES = ["insurance", "registration", "inspection", "rental_agreement"];

function fmtDate(d: string | Date | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-SG", { year: "numeric", month: "short", day: "numeric" });
}

function StatusDot({ status }: { status: string }) {
  return (
    <span style={{
      display: "inline-block", width: 8, height: 8, borderRadius: "50%",
      background: STATUS_DOT[status] ?? "#6b7280", flexShrink: 0,
    }} />
  );
}

export function VehiclesPanel({ initialVehicles, availableDrivers }: Props) {
  const router = useRouter();
  const [vehicles, setVehicles] = useState<Vehicle[]>(initialVehicles);
  const [selected, setSelected] = useState<Vehicle | null>(null);
  const [showAddVehicle, setShowAddVehicle] = useState(false);
  const [showLinkDriver, setShowLinkDriver] = useState(false);
  const [showUploadDoc, setShowUploadDoc] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const addForm = useRef({ make: "", model: "", plateNumber: "", year: "", colour: "", seatingCapacity: "", vehicleClass: "", insuranceCompany: "" });
  const linkForm = useRef({ driverId: "", relationshipType: "contracted", contractExpiry: "" });
  const docForm = useRef({ docType: "insurance", expiryDate: "", issuedDate: "" });
  const fileRef = useRef<HTMLInputElement>(null);

  const refresh = useCallback(async () => {
    const res = await fetch("/api/operator/vehicles");
    if (res.ok) {
      const data = await res.json();
      setVehicles(data);
      if (selected) {
        const updated = data.find((v: Vehicle) => v.id === selected.id);
        if (updated) setSelected(updated);
      }
    }
  }, [selected]);

  async function addVehicle() {
    const f = addForm.current;
    if (!f.make || !f.model || !f.plateNumber) { setError("Make, model, and plate number are required."); return; }
    setSaving(true); setError("");
    const res = await fetch("/api/operator/vehicles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(f),
    });
    setSaving(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? "Failed to add vehicle");
      return;
    }
    setShowAddVehicle(false);
    addForm.current = { make: "", model: "", plateNumber: "", year: "", colour: "", seatingCapacity: "", vehicleClass: "", insuranceCompany: "" };
    await refresh();
  }

  async function linkDriver() {
    if (!selected) return;
    const f = linkForm.current;
    if (!f.driverId) { setError("Select a driver."); return; }
    setSaving(true); setError("");
    const res = await fetch(`/api/operator/vehicles/${selected.id}/ownership`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(f),
    });
    setSaving(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? "Failed to link driver");
      return;
    }
    setShowLinkDriver(false);
    linkForm.current = { driverId: "", relationshipType: "contracted", contractExpiry: "" };
    await refresh();
  }

  async function unlinkDriver(ownershipId: string) {
    if (!selected) return;
    await fetch(`/api/operator/vehicles/${selected.id}/ownership/${ownershipId}`, { method: "DELETE" });
    await refresh();
  }

  async function uploadDoc() {
    if (!selected || !fileRef.current?.files?.[0]) { setError("Select a file."); return; }
    const f = docForm.current;
    if (!f.expiryDate) { setError("Expiry date is required."); return; }
    const formData = new FormData();
    formData.append("file", fileRef.current.files[0]);
    formData.append("docType", f.docType);
    formData.append("expiryDate", f.expiryDate);
    if (f.issuedDate) formData.append("issuedDate", f.issuedDate);
    setSaving(true); setError("");
    const res = await fetch(`/api/operator/vehicles/${selected.id}/documents`, {
      method: "POST",
      body: formData,
    });
    setSaving(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? "Upload failed");
      return;
    }
    setShowUploadDoc(false);
    docForm.current = { docType: "insurance", expiryDate: "", issuedDate: "" };
    if (fileRef.current) fileRef.current.value = "";
    await refresh();
  }

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "7px 10px", borderRadius: 6, border: "1px solid var(--border)",
    background: "var(--surface)", color: "var(--text)", fontSize: 13,
    boxSizing: "border-box",
  };
  const labelStyle: React.CSSProperties = { fontSize: 11, color: "var(--text-dim)", fontWeight: 600, marginBottom: 4, display: "block" };
  const btnStyle = (accent = false): React.CSSProperties => ({
    padding: "7px 14px", borderRadius: 6, border: "none", cursor: saving ? "not-allowed" : "pointer",
    background: accent ? "var(--accent)" : "var(--surface-raised)", color: accent ? "#fff" : "var(--text)",
    fontSize: 12, fontWeight: 600, opacity: saving ? 0.6 : 1,
  });

  return (
    <div style={{ display: "flex", height: "100%", minHeight: 0 }}>
      {/* Left list panel */}
      <div style={{
        width: 280, flexShrink: 0, borderRight: "1px solid var(--border)",
        display: "flex", flexDirection: "column", background: "var(--surface)",
      }}>
        <div style={{ padding: "16px 16px 10px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontWeight: 700, fontSize: 14 }}>Vehicles</span>
          <button onClick={() => { setShowAddVehicle(true); setError(""); }} style={btnStyle(true)}>+ Add</button>
        </div>
        <div style={{ flex: 1, overflowY: "auto" }}>
          {vehicles.length === 0 && (
            <div style={{ padding: "32px 16px", textAlign: "center", color: "var(--text-dim)", fontSize: 13 }}>
              No vehicles registered yet.
            </div>
          )}
          {vehicles.map(v => {
            const primaryDriver = v.ownership[0]?.driver;
            const docWarning = v.documents.some(d => d.status === "expired" || d.status === "rejected");
            const isSelected = selected?.id === v.id;
            return (
              <button
                key={v.id}
                onClick={() => setSelected(v)}
                style={{
                  width: "100%", textAlign: "left", padding: "12px 16px",
                  background: isSelected ? "var(--surface-raised)" : "transparent",
                  border: "none", borderBottom: "1px solid var(--border)", cursor: "pointer",
                  borderLeft: isSelected ? "3px solid var(--accent)" : "3px solid transparent",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <StatusDot status={v.status} />
                  <span style={{ fontWeight: 700, fontSize: 13, fontFamily: "monospace" }}>{v.plateNumber}</span>
                  {docWarning && (
                    <span style={{ fontSize: 10, color: "#ef4444", fontWeight: 700, marginLeft: "auto" }}>!</span>
                  )}
                </div>
                <div style={{ fontSize: 12, color: "var(--text-dim)" }}>{v.make} {v.model}{v.year ? ` (${v.year})` : ""}</div>
                {primaryDriver && (
                  <div style={{ fontSize: 11, color: "var(--text-faint)", marginTop: 2 }}>
                    {primaryDriver.firstName} {primaryDriver.lastName}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Right detail panel */}
      <div style={{ flex: 1, overflowY: "auto", padding: 24 }}>
        {!selected ? (
          <div style={{ color: "var(--text-dim)", fontSize: 14, marginTop: 60, textAlign: "center" }}>
            Select a vehicle to view details
          </div>
        ) : (
          <div>
            {/* Header */}
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <StatusDot status={selected.status} />
                  <h2 style={{ margin: 0, fontSize: 20, fontFamily: "monospace", fontWeight: 800 }}>{selected.plateNumber}</h2>
                  <span style={{ fontSize: 12, padding: "2px 8px", borderRadius: 10, background: "var(--surface-raised)", color: "var(--text-dim)" }}>
                    {selected.status}
                  </span>
                  {selected.vehicleClass && (
                    <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 10, border: "1px solid var(--accent)", color: "var(--accent)", fontWeight: 700 }}>
                      {selected.vehicleClass}
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 14, color: "var(--text-dim)", marginTop: 4 }}>
                  {selected.make} {selected.model}
                  {selected.year ? ` · ${selected.year}` : ""}
                  {selected.colour ? ` · ${selected.colour}` : ""}
                  {selected.seatingCapacity ? ` · ${selected.seatingCapacity} pax` : ""}
                </div>
                {selected.insuranceCompany && (
                  <div style={{ fontSize: 12, color: "var(--text-faint)", marginTop: 2 }}>Insurance: {selected.insuranceCompany}</div>
                )}
              </div>
            </div>

            {/* Drivers section */}
            <Section title="Linked Drivers" action={{ label: "+ Link Driver", onClick: () => { setShowLinkDriver(true); setError(""); } }}>
              {selected.ownership.length === 0 ? (
                <div style={{ color: "var(--text-faint)", fontSize: 13 }}>No drivers linked.</div>
              ) : (
                selected.ownership.map(o => (
                  <div key={o.id} style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "10px 14px", background: "var(--surface)", borderRadius: 6,
                    border: "1px solid var(--border)", marginBottom: 8,
                  }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{o.driver.firstName} {o.driver.lastName}</div>
                      <div style={{ fontSize: 11, color: "var(--text-dim)", marginTop: 2 }}>
                        {o.relationshipType}
                        {o.contractExpiry ? ` · expires ${fmtDate(o.contractExpiry)}` : ""}
                        {" · "}
                        <span style={{ color: o.driver.complianceStatus === "active" ? "#22c55e" : "#f59e0b" }}>
                          {o.driver.complianceStatus}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => unlinkDriver(o.id)}
                      style={{ ...btnStyle(), fontSize: 11, padding: "4px 10px", color: "#ef4444" }}
                    >
                      Unlink
                    </button>
                  </div>
                ))
              )}
            </Section>

            {/* Documents section */}
            <Section title="Compliance Documents" action={{ label: "+ Upload Doc", onClick: () => { setShowUploadDoc(true); setError(""); } }}>
              {selected.documents.length === 0 ? (
                <div style={{ color: "var(--text-faint)", fontSize: 13 }}>No documents uploaded.</div>
              ) : (
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid var(--border)" }}>
                      {["Type", "Status", "Expiry", "File"].map(h => (
                        <th key={h} style={{ textAlign: "left", padding: "6px 12px", fontSize: 11, color: "var(--text-dim)", fontWeight: 600 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {selected.documents.map(d => (
                      <tr key={d.id} style={{ borderBottom: "1px solid var(--border)" }}>
                        <td style={{ padding: "8px 12px", fontWeight: 600 }}>{d.docType}</td>
                        <td style={{ padding: "8px 12px" }}>
                          <span style={{ color: DOC_STATUS_COLOUR[d.status] ?? "var(--text-dim)" }}>{d.status}</span>
                        </td>
                        <td style={{ padding: "8px 12px", color: "var(--text-dim)" }}>{fmtDate(d.expiryDate)}</td>
                        <td style={{ padding: "8px 12px", color: "var(--text-faint)", fontSize: 11 }}>
                          {d.file?.fileName ?? "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Section>
          </div>
        )}
      </div>

      {/* Add Vehicle Modal */}
      {showAddVehicle && (
        <Modal title="Add Vehicle" onClose={() => setShowAddVehicle(false)}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="Make *">
              <input style={inputStyle} placeholder="Toyota" onChange={e => addForm.current.make = e.target.value} />
            </Field>
            <Field label="Model *">
              <input style={inputStyle} placeholder="Alphard" onChange={e => addForm.current.model = e.target.value} />
            </Field>
            <Field label="Plate Number *">
              <input style={inputStyle} placeholder="SXX0000X" onChange={e => addForm.current.plateNumber = e.target.value} />
            </Field>
            <Field label="Year">
              <input style={inputStyle} type="number" placeholder="2023" onChange={e => addForm.current.year = e.target.value} />
            </Field>
            <Field label="Colour">
              <input style={inputStyle} placeholder="Pearl White" onChange={e => addForm.current.colour = e.target.value} />
            </Field>
            <Field label="Seating Capacity">
              <input style={inputStyle} type="number" placeholder="7" onChange={e => addForm.current.seatingCapacity = e.target.value} />
            </Field>
            <Field label="Vehicle Class">
              <select style={inputStyle} defaultValue="" onChange={e => addForm.current.vehicleClass = e.target.value}>
                <option value="">— Select class —</option>
                {VEHICLE_CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="Insurance Company">
              <input style={inputStyle} placeholder="NTUC Income" onChange={e => addForm.current.insuranceCompany = e.target.value} />
            </Field>
          </div>
          {error && <div style={{ color: "#ef4444", fontSize: 12, marginTop: 8 }}>{error}</div>}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
            <button style={btnStyle()} onClick={() => setShowAddVehicle(false)}>Cancel</button>
            <button style={btnStyle(true)} onClick={addVehicle} disabled={saving}>
              {saving ? "Adding…" : "Add Vehicle"}
            </button>
          </div>
        </Modal>
      )}

      {/* Link Driver Modal */}
      {showLinkDriver && selected && (
        <Modal title="Link Driver" onClose={() => setShowLinkDriver(false)}>
          <Field label="Driver">
            <select style={inputStyle} defaultValue="" onChange={e => linkForm.current.driverId = e.target.value}>
              <option value="">— Select driver —</option>
              {availableDrivers.map(d => (
                <option key={d.id} value={d.id}>
                  {d.firstName} {d.lastName} ({d.complianceStatus})
                </option>
              ))}
            </select>
          </Field>
          <Field label="Relationship">
            <select style={inputStyle} defaultValue="contracted" onChange={e => linkForm.current.relationshipType = e.target.value}>
              <option value="contracted">Contracted</option>
              <option value="owned">Owned</option>
            </select>
          </Field>
          <Field label="Contract Expiry (optional)">
            <input style={inputStyle} type="date" onChange={e => linkForm.current.contractExpiry = e.target.value} />
          </Field>
          {error && <div style={{ color: "#ef4444", fontSize: 12, marginTop: 8 }}>{error}</div>}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
            <button style={btnStyle()} onClick={() => setShowLinkDriver(false)}>Cancel</button>
            <button style={btnStyle(true)} onClick={linkDriver} disabled={saving}>
              {saving ? "Saving…" : "Link Driver"}
            </button>
          </div>
        </Modal>
      )}

      {/* Upload Doc Modal */}
      {showUploadDoc && selected && (
        <Modal title="Upload Document" onClose={() => setShowUploadDoc(false)}>
          <Field label="Document Type">
            <select style={inputStyle} defaultValue="insurance" onChange={e => docForm.current.docType = e.target.value}>
              {DOC_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </Field>
          <Field label="File">
            <input ref={fileRef} type="file" accept=".jpg,.jpeg,.png,.webp,.heic,.pdf" style={{ ...inputStyle, padding: "6px 10px" }} />
          </Field>
          <Field label="Expiry Date *">
            <input style={inputStyle} type="date" onChange={e => docForm.current.expiryDate = e.target.value} />
          </Field>
          <Field label="Issued Date (optional)">
            <input style={inputStyle} type="date" onChange={e => docForm.current.issuedDate = e.target.value} />
          </Field>
          {error && <div style={{ color: "#ef4444", fontSize: 12, marginTop: 8 }}>{error}</div>}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
            <button style={btnStyle()} onClick={() => setShowUploadDoc(false)}>Cancel</button>
            <button style={btnStyle(true)} onClick={uploadDoc} disabled={saving}>
              {saving ? "Uploading…" : "Upload"}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function Section({ title, children, action }: { title: string; children: React.ReactNode; action?: { label: string; onClick: () => void } }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <h3 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
          {title}
        </h3>
        {action && (
          <button
            onClick={action.onClick}
            style={{
              fontSize: 11, padding: "4px 10px", borderRadius: 6, border: "1px solid var(--border)",
              background: "none", color: "var(--accent)", cursor: "pointer", fontWeight: 600,
            }}
          >
            {action.label}
          </button>
        )}
      </div>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={{ fontSize: 11, color: "var(--text-dim)", fontWeight: 600, display: "block", marginBottom: 4 }}>
        {label}
      </label>
      {children}
    </div>
  );
}

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000,
      display: "flex", alignItems: "center", justifyContent: "center",
    }} onClick={onClose}>
      <div style={{
        background: "var(--surface)", borderRadius: 10, padding: 24, width: 480, maxWidth: "90vw",
        maxHeight: "80vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.4)",
      }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>{title}</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-dim)", fontSize: 18 }}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}
