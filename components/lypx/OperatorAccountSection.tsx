"use client";

import { useState, useEffect } from "react";

interface Props {
  name: string;
  contactName?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
}

export function OperatorAccountSection({ name, contactName, contactEmail, contactPhone }: Props) {
  const initial = {
    name,
    contactName:  contactName  ?? "",
    contactEmail: contactEmail ?? "",
    contactPhone: contactPhone ?? "",
  };
  const [current, setCurrent] = useState(initial);
  const [savedSnapshot, setSavedSnapshot] = useState(initial);
  const hasChanges = JSON.stringify(current) !== JSON.stringify(savedSnapshot);

  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"success" | "error" | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (saveStatus === "success") {
      const t = setTimeout(() => setSaveStatus(null), 3000);
      return () => clearTimeout(t);
    }
  }, [saveStatus]);

  async function handleSave() {
    if (!current.name.trim()) return;
    setSaving(true);
    setSaveStatus(null);
    const res = await fetch("/api/operator/settings/account", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(current),
    });
    setSaving(false);
    if (res.ok) {
      setSavedSnapshot({ ...current });
      setSaveStatus("success");
    } else {
      const d = await res.json().catch(() => ({}));
      setErrorMsg(d.error ?? "Failed to save");
      setSaveStatus("error");
    }
  }

  const inputStyle: React.CSSProperties = {
    width: "100%", background: "var(--surface-raised)", border: "1px solid var(--border)",
    borderRadius: 4, color: "var(--text)", fontSize: 13, padding: "8px 10px",
  };
  const labelStyle: React.CSSProperties = {
    display: "block", fontSize: 11, color: "var(--text-dim)", marginBottom: 4,
    fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.5px",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div>
        <label style={labelStyle}>Company Name *</label>
        <input
          value={current.name}
          onChange={e => setCurrent(c => ({ ...c, name: e.target.value }))}
          style={inputStyle}
          placeholder="e.g. Prestige Limo Pte Ltd"
        />
      </div>
      <div>
        <label style={labelStyle}>Contact Name</label>
        <input
          value={current.contactName}
          onChange={e => setCurrent(c => ({ ...c, contactName: e.target.value }))}
          style={inputStyle}
          placeholder="e.g. John Tan"
        />
      </div>
      <div>
        <label style={labelStyle}>Contact Email</label>
        <input
          type="email"
          value={current.contactEmail}
          onChange={e => setCurrent(c => ({ ...c, contactEmail: e.target.value }))}
          style={inputStyle}
          placeholder="e.g. john@company.com"
        />
      </div>
      <div>
        <label style={labelStyle}>Contact Phone (WhatsApp)</label>
        <input
          type="tel"
          value={current.contactPhone}
          onChange={e => setCurrent(c => ({ ...c, contactPhone: e.target.value }))}
          style={inputStyle}
          placeholder="+65 9123 4567"
        />
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 12, paddingTop: 4 }}>
        <button
          onClick={handleSave}
          disabled={!hasChanges || saving}
          style={{
            background: hasChanges && !saving ? "var(--accent)" : "var(--surface-raised)",
            border: "none", borderRadius: 4,
            color: hasChanges && !saving ? "#1A1305" : "var(--text-faint)",
            fontSize: 12, fontWeight: 700, padding: "9px 20px",
            cursor: hasChanges && !saving ? "pointer" : "not-allowed",
          }}
        >
          {saving ? "Saving…" : "Save Account Details"}
        </button>
        {saveStatus === "success" && (
          <span style={{ fontSize: 12, color: "#22c55e" }}>✓ Saved successfully</span>
        )}
        {saveStatus === "error" && (
          <span style={{ fontSize: 12, color: "#ef4444" }}>✗ {errorMsg ?? "Failed to save"}</span>
        )}
      </div>
    </div>
  );
}
