"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { SUPPORTED_TIMEZONES } from "@/lib/utils/date";

interface Props {
  currentTimezone: string;
}

export function TimezoneSelector({ currentTimezone }: Props) {
  const router = useRouter();
  const [timezone, setTimezone] = useState(currentTimezone);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (saved) {
      const t = setTimeout(() => setSaved(false), 3000);
      return () => clearTimeout(t);
    }
  }, [saved]);

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSaved(false);

    const res = await fetch("/api/preferences", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ timezone }),
    });

    const data = await res.json();
    setSaving(false);

    if (!res.ok) {
      setError(data.error ?? "Failed to save");
      return;
    }

    setSaved(true);
    router.refresh();
  }

  const noChanges = timezone === currentTimezone;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <select
        value={timezone}
        onChange={(e) => { setTimezone(e.target.value); setSaved(false); }}
        style={{
          background: "var(--surface-raised)", border: "1px solid var(--border)",
          borderRadius: 4, color: "var(--text-primary)", fontSize: 13,
          padding: "8px 10px", width: "100%", cursor: "pointer", outline: "none",
        }}
      >
        {SUPPORTED_TIMEZONES.map((tz) => (
          <option key={tz.value} value={tz.value}>{tz.label}</option>
        ))}
      </select>

      {error && (
        <div style={{
          background: "rgba(217,83,79,0.12)", border: "1px solid rgba(217,83,79,0.3)",
          borderRadius: 4, padding: "8px 12px", color: "var(--red)", fontSize: 13,
        }}>
          {error}
        </div>
      )}

      {saved && (
        <div style={{
          background: "rgba(76,175,109,0.12)", border: "1px solid rgba(76,175,109,0.3)",
          borderRadius: 4, padding: "8px 12px", color: "var(--green)", fontSize: 13,
          display: "flex", alignItems: "center", gap: 6,
        }}>
          ✓ Timezone saved
        </div>
      )}

      <button
        onClick={handleSave}
        disabled={saving || noChanges}
        title={noChanges ? "No changes to save" : undefined}
        style={{
          alignSelf: "flex-start",
          background: !noChanges && !saving ? "var(--accent-color)" : "var(--surface-raised)",
          border: "none", borderRadius: 4,
          color: !noChanges && !saving ? "var(--primary-foreground)" : "var(--text-faint)",
          fontSize: 12, fontWeight: 700, padding: "9px 20px",
          cursor: !noChanges && !saving ? "pointer" : "not-allowed",
        }}
      >
        {saving ? "Saving…" : "Save Display Settings"}
      </button>
    </div>
  );
}
