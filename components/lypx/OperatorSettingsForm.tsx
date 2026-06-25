"use client";

import { useState, useEffect } from "react";
import { LogoUpload } from "@/components/lypx/LogoUpload";
import { hueToAccent, applyAccent } from "@/lib/utils/theme";

function hexToHue(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  if (max === min) return 0;
  const d = max - min;
  let h = 0;
  if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  return Math.round((h / 6) * 360);
}

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
  currentAccent: string;
  currentLogoUrl: string | null;
  name: string;
  contactName?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
}

export function OperatorSettingsForm({
  tenantId,
  currentTimezone,
  currentAccent,
  currentLogoUrl,
  name,
  contactName,
  contactEmail,
  contactPhone,
}: Props) {
  const initial = {
    hue: hexToHue(currentAccent),
    timezone: currentTimezone,
    name,
    contactName:  contactName  ?? "",
    contactEmail: contactEmail ?? "",
    contactPhone: contactPhone ?? "",
  };

  const [form, setForm] = useState(initial);
  const [savedSnapshot, setSavedSnapshot] = useState(initial);
  const hasChanges = JSON.stringify(form) !== JSON.stringify(savedSnapshot);

  const previewAccent = hueToAccent(form.hue);
  useEffect(() => { applyAccent(previewAccent); }, [previewAccent]);

  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"success" | "error" | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (saveStatus === "success") {
      const t = setTimeout(() => setSaveStatus(null), 3000);
      return () => clearTimeout(t);
    }
  }, [saveStatus]);

  function set<K extends keyof typeof initial>(key: K, value: typeof initial[K]) {
    setForm(f => ({ ...f, [key]: value }));
    setSaveStatus(null);
  }

  async function handleSave() {
    if (!form.name.trim()) {
      setErrorMsg("Company name is required");
      setSaveStatus("error");
      return;
    }

    setSaving(true);
    setSaveStatus(null);
    setErrorMsg(null);

    const errors: string[] = [];

    const prefChanged = form.hue !== savedSnapshot.hue || form.timezone !== savedSnapshot.timezone;
    if (prefChanged) {
      const res = await fetch(`/api/operators/${tenantId}/preferences`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ timezone: form.timezone, accentColour: previewAccent }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        errors.push(d.error ?? "Failed to save display settings");
      }
    }

    const accountChanged =
      form.name !== savedSnapshot.name ||
      form.contactName  !== savedSnapshot.contactName  ||
      form.contactEmail !== savedSnapshot.contactEmail ||
      form.contactPhone !== savedSnapshot.contactPhone;
    if (accountChanged) {
      const res = await fetch("/api/operator/settings/account", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          contactName:  form.contactName,
          contactEmail: form.contactEmail,
          contactPhone: form.contactPhone,
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        errors.push(d.error ?? "Failed to save account details");
      }
    }

    setSaving(false);

    if (errors.length > 0) {
      setErrorMsg(errors.join(" · "));
      setSaveStatus("error");
    } else {
      setSavedSnapshot({ ...form });
      setSaveStatus("success");
    }
  }

  // ── Styles ──────────────────────────────────────────────────────────────
  const sectionLabel: React.CSSProperties = {
    fontSize: 11, color: "var(--text-faint)", fontWeight: 500,
    textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: 16,
  };
  const card: React.CSSProperties = {
    background: "var(--surface)", border: "1px solid var(--border)",
    borderRadius: 8, padding: 24,
  };
  const fieldLabel: React.CSSProperties = {
    display: "block", fontSize: 11, color: "var(--text-dim)", marginBottom: 4,
    fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.5px",
  };
  const inputStyle: React.CSSProperties = {
    width: "100%", background: "var(--surface-raised)", border: "1px solid var(--border)",
    borderRadius: 4, color: "var(--text)", fontSize: 13, padding: "8px 10px",
  };
  const subsectionTitle: React.CSSProperties = {
    fontSize: 11, fontWeight: 700, color: "var(--text-dim)",
    textTransform: "uppercase", letterSpacing: "0.7px", marginBottom: 6,
  };
  const hint: React.CSSProperties = {
    fontSize: 13, color: "var(--text-faint)", marginBottom: 16,
  };

  const spectrumGradient =
    "linear-gradient(to right, hsl(0,75%,60%), hsl(30,75%,60%), hsl(60,75%,60%), hsl(90,75%,60%), hsl(120,75%,60%), hsl(150,75%,60%), hsl(180,75%,60%), hsl(210,75%,60%), hsl(240,75%,60%), hsl(270,75%,60%), hsl(300,75%,60%), hsl(330,75%,60%), hsl(360,75%,60%))";

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div>
      {/* Company Details */}
      <section style={{ marginBottom: 36 }}>
        <p style={sectionLabel}>Company Details</p>
        <div style={card}>
          <p style={hint}>Contact phone is used as the requestor WhatsApp number for trip notifications.</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label style={fieldLabel}>Company Name *</label>
              <input value={form.name} onChange={e => set("name", e.target.value)} style={inputStyle} placeholder="e.g. Prestige Limo Pte Ltd" />
            </div>
            <div>
              <label style={fieldLabel}>Contact Name</label>
              <input value={form.contactName} onChange={e => set("contactName", e.target.value)} style={inputStyle} placeholder="e.g. John Tan" />
            </div>
            <div>
              <label style={fieldLabel}>Contact Email</label>
              <input type="email" value={form.contactEmail} onChange={e => set("contactEmail", e.target.value)} style={inputStyle} placeholder="e.g. john@company.com" />
            </div>
            <div>
              <label style={fieldLabel}>Contact Phone (WhatsApp)</label>
              <input type="tel" value={form.contactPhone} onChange={e => set("contactPhone", e.target.value)} style={inputStyle} placeholder="+65 9123 4567" />
            </div>
          </div>
        </div>
      </section>

      {/* Branding */}
      <section style={{ marginBottom: 36 }}>
        <p style={sectionLabel}>Branding</p>
        <div style={card}>
          <p style={subsectionTitle}>Logo</p>
          <p style={hint}>Appears in the top navigation bar. Uploads immediately on file selection.</p>
          <LogoUpload currentLogoUrl={currentLogoUrl} />

          <div style={{ borderTop: "1px solid var(--border)", margin: "24px 0" }} />

          <p style={subsectionTitle}>Brand Accent Colour</p>
          <p style={hint}>Choose one colour to represent your brand. Background will always remain dark.</p>

          <div style={{ marginBottom: 20 }}>
            <div style={{ position: "relative", height: 20, borderRadius: 10, background: spectrumGradient, marginBottom: 8 }}>
              <input
                type="range"
                min={0}
                max={360}
                value={form.hue}
                onChange={e => set("hue", parseInt(e.target.value))}
                style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0, cursor: "pointer", margin: 0 }}
              />
              <div style={{
                position: "absolute",
                left: `calc(${form.hue / 360 * 100}% - 10px)`,
                top: 0, width: 20, height: 20, borderRadius: "50%",
                border: "2px solid white", background: previewAccent,
                boxShadow: "0 1px 4px rgba(0,0,0,0.5)", pointerEvents: "none",
              }} />
            </div>
            <p className="mono" style={{ fontSize: 11, color: "var(--text-faint)" }}>{previewAccent.toUpperCase()}</p>
          </div>

          {/* Colour preview strip */}
          <div style={{ background: "var(--surface-raised)", border: "1px solid var(--border)", borderRadius: 6, padding: "14px 18px" }}>
            <p style={{ fontSize: 10, color: "var(--text-faint)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 12 }}>Preview</p>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <button style={{ background: previewAccent, color: "#1A1305", border: "none", borderRadius: 4, fontSize: 11, fontWeight: 700, padding: "7px 16px" }}>ASSIGN</button>
              <span style={{ background: previewAccent, color: "#1A1305", fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 4 }}>3</span>
              <span style={{ color: previewAccent, fontSize: 12 }}>● Active</span>
              <span style={{ color: "var(--text)", fontSize: 12.5, fontWeight: 600, borderBottom: `2px solid ${previewAccent}`, paddingBottom: 2 }}>Dispatch Centre</span>
            </div>
          </div>
        </div>
      </section>

      {/* Display */}
      <section style={{ marginBottom: 36 }}>
        <p style={sectionLabel}>Display</p>
        <div style={card}>
          <p style={subsectionTitle}>Timezone</p>
          <p style={hint}>Used for displaying pickup times and reservation dates.</p>
          <select
            value={form.timezone}
            onChange={e => set("timezone", e.target.value)}
            style={{
              background: "var(--surface-raised)", border: "1px solid var(--border)",
              borderRadius: 4, color: "var(--text)", fontSize: 13, padding: "8px 10px",
              width: "100%", cursor: "pointer",
            }}
          >
            {TIMEZONES.map(tz => (
              <option key={tz.value} value={tz.value}>{tz.label}</option>
            ))}
          </select>
        </div>
      </section>

      {/* Single save button */}
      <div style={{ borderTop: "1px solid var(--border)", paddingTop: 24, display: "flex", alignItems: "center", gap: 16 }}>
        <button
          onClick={handleSave}
          disabled={!hasChanges || saving}
          title={!hasChanges ? "No changes to save" : undefined}
          style={{
            background: hasChanges && !saving ? "var(--accent)" : "var(--surface-raised)",
            border: "none", borderRadius: 4,
            color: hasChanges && !saving ? "#1A1305" : "var(--text-faint)",
            fontSize: 13, fontWeight: 700, padding: "10px 28px",
            cursor: hasChanges && !saving ? "pointer" : "not-allowed",
          }}
        >
          {saving ? "Saving…" : "Save Settings"}
        </button>
        {saveStatus === "success" && (
          <span style={{ fontSize: 13, color: "#22c55e" }}>✓ Settings saved</span>
        )}
        {saveStatus === "error" && (
          <span style={{ fontSize: 13, color: "#ef4444" }}>✗ {errorMsg}</span>
        )}
      </div>
    </div>
  );
}
