"use client";

import { useState } from "react";

export function MarketplaceToggle({ tenantId, initialValue }: { tenantId: string; initialValue: boolean }) {
  const [enabled, setEnabled] = useState(initialValue);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave(next: boolean) {
    setSaving(true);
    setError(null);
    setSaved(false);
    const res = await fetch("/api/operator/settings/marketplace", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ marketplaceParticipation: next }),
    });
    setSaving(false);
    if (!res.ok) {
      const d = await res.json();
      setError(d.error ?? "Failed to save");
      setEnabled(!next);
      return;
    }
    setEnabled(next);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  return (
    <div>
      <label style={{ display: "flex", alignItems: "flex-start", gap: 14, cursor: "pointer" }}>
        <div
          onClick={() => !saving && handleSave(!enabled)}
          style={{
            marginTop: 2,
            width: 40, height: 22, borderRadius: 11,
            background: enabled ? "var(--gold)" : "var(--surface-raised)",
            border: "1px solid var(--border)",
            position: "relative", cursor: "pointer", flexShrink: 0,
            transition: "background 0.2s",
          }}
        >
          <div style={{
            position: "absolute", top: 3, left: enabled ? 20 : 3,
            width: 14, height: 14, borderRadius: "50%",
            background: enabled ? "#000" : "var(--text-faint)",
            transition: "left 0.2s",
          }} />
        </div>
        <div>
          <p style={{ fontSize: 13, color: "var(--text)", fontWeight: 500, margin: 0 }}>
            Make my drivers available for LyPX Direct jobs
          </p>
          <p style={{ fontSize: 12, color: "var(--text-dim)", marginTop: 6, lineHeight: 1.6, margin: "6px 0 0" }}>
            When enabled, your compliant Tier 2 and Tier 3 drivers will appear in the LyPX Direct driver pool
            and may be assigned to jobs sourced by LyPX on behalf of corporate clients.
            You will receive the trip fare minus LyPX's marketplace fee. Your Tier 1 drivers are not shared.
          </p>
        </div>
      </label>

      {error && <p style={{ fontSize: 12, color: "#ef4444", marginTop: 10 }}>{error}</p>}
      {saved && <p style={{ fontSize: 12, color: "#22c55e", marginTop: 10 }}>Saved.</p>}
      {saving && <p style={{ fontSize: 12, color: "var(--text-dim)", marginTop: 10 }}>Saving…</p>}
    </div>
  );
}
