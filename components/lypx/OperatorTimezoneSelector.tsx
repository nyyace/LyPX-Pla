"use client";

import { useState, useTransition } from "react";

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
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const tz = e.target.value;
    setValue(tz);
    setSaved(false);
    startTransition(async () => {
      await fetch(`/api/operators/${tenantId}/preferences`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ timezone: tz }),
      });
      setSaved(true);
    });
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <select
        value={value}
        onChange={handleChange}
        disabled={isPending}
        style={{
          background: "var(--surface-raised)", border: "1px solid var(--border)",
          borderRadius: 4, color: "var(--text)", fontSize: 13, padding: "8px 10px",
          minWidth: 260, cursor: "pointer",
        }}
      >
        {TIMEZONES.map(tz => (
          <option key={tz.value} value={tz.value}>{tz.label}</option>
        ))}
      </select>
      {saved && !isPending && (
        <span style={{ fontSize: 11, color: "#22c55e" }}>Saved</span>
      )}
    </div>
  );
}
