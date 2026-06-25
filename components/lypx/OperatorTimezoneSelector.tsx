"use client";

import { useState, useEffect } from "react";

const TIMEZONES = [
  { value: "Asia/Singapore",    label: "Singapore (SGT, UTC+8)" },
  { value: "Asia/Kuala_Lumpur", label: "Kuala Lumpur (MYT, UTC+8)" },
  { value: "Asia/Bangkok",      label: "Bangkok (ICT, UTC+7)" },
  { value: "Asia/Jakarta",      label: "Jakarta (WIB, UTC+7)" },
  { value: "Asia/Hong_Kong",    label: "Hong Kong (HKT, UTC+8)" },
  { value: "Asia/Tokyo",        label: "Tokyo (JST, UTC+9)" },
  { value: "Asia/Dubai",        label: "Dubai (GST, UTC+4)" },
  { value: "Europe/London",     label: "London (GMT/BST)" },
  { value: "UTC",               label: "UTC" },
];

interface Props {
  tenantId: string;
  currentTimezone: string;
}

export function OperatorTimezoneSelector({ tenantId, currentTimezone }: Props) {
  const [value, setValue] = useState(currentTimezone);
  const [savedValue, setSavedValue] = useState(currentTimezone);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"success" | "error" | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const hasChanges = value !== savedValue;

  useEffect(() => {
    if (saveStatus === "success") {
      const t = setTimeout(() => setSaveStatus(null), 3000);
      return () => clearTimeout(t);
    }
  }, [saveStatus]);

  async function handleSave() {
    setSaving(true);
    setSaveStatus(null);
    const res = await fetch(`/api/operators/${tenantId}/preferences`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ timezone: value }),
    });
    setSaving(false);
    if (res.ok) {
      setSavedValue(value);
      setSaveStatus("success");
    } else {
      const d = await res.json().catch(() => ({}));
      setErrorMsg(d.error ?? "Failed to save");
      setSaveStatus("error");
    }
  }

  const selectStyle: React.CSSProperties = {
    background: "var(--surface-raised)", border: "1px solid var(--border)",
    borderRadius: 4, color: "var(--text)", fontSize: 13, padding: "8px 10px",
    width: "100%", cursor: "pointer",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <select value={value} onChange={e => { setValue(e.target.value); setSaveStatus(null); }} style={selectStyle}>
        {TIMEZONES.map(tz => (
          <option key={tz.value} value={tz.value}>{tz.label}</option>
        ))}
      </select>

      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
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
          {saving ? "Saving…" : "Save Display Settings"}
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
