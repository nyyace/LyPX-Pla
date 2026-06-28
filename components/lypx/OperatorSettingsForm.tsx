"use client";

import { useState, useEffect } from "react";
import { LogoUpload } from "@/components/lypx/LogoUpload";
import { PhoneInput } from "@/components/ui/PhoneInput";
import {
  BgMode,
  applyTheme,
  getStoredTheme,
  saveTheme,
} from "@/lib/utils/theme";
import { FontSizePref, applyFontSize, getStoredFontSize, saveFontSize } from "@/lib/utils/fontSize";

function isValidHex(h: string): boolean {
  return /^#[0-9a-fA-F]{6}$/.test(h);
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
  userId: string;
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
  userId,
  currentTimezone,
  currentAccent,
  currentLogoUrl,
  name,
  contactName,
  contactEmail,
  contactPhone,
}: Props) {
  // DB-backed fields (company + timezone)
  const initial = {
    timezone: currentTimezone,
    name,
    contactName:  contactName  ?? "",
    contactEmail: contactEmail ?? "",
    contactPhone: contactPhone ?? "",
  };
  const [form, setForm] = useState(initial);
  const [savedSnapshot, setSavedSnapshot] = useState(initial);

  // DB accent — tracks what's currently in DB (separate from localStorage)
  const [dbAccent, setDbAccent] = useState(currentAccent);

  const [appearance, setAppearance] = useState<{ bg: BgMode; accent: string }>({
    bg: "dark",
    accent: currentAccent,
  });
  const [savedAppearance, setSavedAppearance] = useState<{ bg: BgMode; accent: string }>({
    bg: "dark",
    accent: currentAccent,
  });

  // Hex input field draft (allows typing incomplete hex without breaking color picker)
  const [hexDraft, setHexDraft] = useState(currentAccent);

  // Font size
  const [fontSize, setFontSize]           = useState<FontSizePref>("medium");
  const [savedFontSize, setSavedFontSize] = useState<FontSizePref>("medium");

  // Load from localStorage on mount
  useEffect(() => {
    const stored = getStoredTheme(tenantId);
    if (stored) {
      setAppearance(stored);
      setSavedAppearance(stored);
      setHexDraft(stored.accent);
      applyTheme(stored.bg, stored.accent);
    }
    const storedSize = getStoredFontSize(userId);
    setFontSize(storedSize);
    setSavedFontSize(storedSize);
    applyFontSize(storedSize);
  }, [tenantId, userId]);

  // Live preview on every appearance change
  useEffect(() => {
    applyTheme(appearance.bg, appearance.accent);
  }, [appearance]);

  // Live preview on font size change
  useEffect(() => {
    applyFontSize(fontSize);
  }, [fontSize]);

  const hasFormChanges = JSON.stringify(form) !== JSON.stringify(savedSnapshot);
  const hasAppearanceChanges = JSON.stringify(appearance) !== JSON.stringify(savedAppearance) || fontSize !== savedFontSize;
  const hasAnyChanges = hasFormChanges || hasAppearanceChanges;

  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"success" | "error" | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (saveStatus === "success") {
      const t = setTimeout(() => setSaveStatus(null), 2000);
      return () => clearTimeout(t);
    }
  }, [saveStatus]);

  function set<K extends keyof typeof initial>(key: K, value: typeof initial[K]) {
    setForm(f => ({ ...f, [key]: value }));
    setSaveStatus(null);
  }

  function handleColorPick(e: React.ChangeEvent<HTMLInputElement>) {
    const hex = e.target.value;
    setHexDraft(hex);
    setAppearance(a => ({ ...a, accent: hex }));
  }

  function handleHexInput(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value.replace(/[^0-9a-fA-F]/g, "");
    setHexDraft("#" + raw);
    if (raw.length === 6) {
      setAppearance(a => ({ ...a, accent: "#" + raw }));
    }
  }

  function handleHexBlur() {
    if (!isValidHex(hexDraft)) {
      setHexDraft(appearance.accent);
    }
  }

  // Save Settings → DB (company details + timezone + accent)
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

    const prefChanged =
      appearance.accent !== dbAccent ||
      form.timezone !== savedSnapshot.timezone;

    if (prefChanged) {
      const res = await fetch(`/api/operators/${tenantId}/preferences`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ timezone: form.timezone, accentColour: appearance.accent }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        errors.push(d.error ?? "Failed to save display settings");
      }
    }

    const accountChanged =
      form.name          !== savedSnapshot.name          ||
      form.contactName   !== savedSnapshot.contactName   ||
      form.contactEmail  !== savedSnapshot.contactEmail  ||
      form.contactPhone  !== savedSnapshot.contactPhone;

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
      setSavedAppearance({ ...appearance });
      setSavedFontSize(fontSize);
      setDbAccent(appearance.accent);
      saveTheme(appearance.bg, appearance.accent, tenantId);
      saveFontSize(fontSize, userId);
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

  const toggleBtn = (active: boolean): React.CSSProperties => ({
    background: active ? "var(--accent)" : "var(--surface-raised)",
    border: `1px solid ${active ? "var(--accent)" : "var(--border)"}`,
    borderRadius: 4,
    color: active ? "var(--primary-foreground)" : "var(--text-dim)",
    fontSize: 12, fontWeight: active ? 700 : 500,
    padding: "7px 20px", cursor: "pointer",
  });

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div>
      {/* Appearance */}
      <section style={{ marginBottom: 36 }}>
        <p style={sectionLabel}>Appearance</p>
        <div style={card}>

          {/* Row 1: Background toggle */}
          <p style={subsectionTitle}>Background</p>
          <p style={hint}>Choose between dark and light console background.</p>
          <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
            <button
              type="button"
              style={toggleBtn(appearance.bg === "dark")}
              onClick={() => setAppearance(a => ({ ...a, bg: "dark" }))}
            >
              Dark
            </button>
            <button
              type="button"
              style={toggleBtn(appearance.bg === "light")}
              onClick={() => setAppearance(a => ({ ...a, bg: "light" }))}
            >
              Light
            </button>
          </div>

          <div style={{ borderTop: "1px solid var(--border)", marginBottom: 24 }} />

          {/* Row 2: Brand Colour */}
          <p style={subsectionTitle}>Brand Colour</p>
          <p style={hint}>Pick your brand colour. Changes apply instantly.</p>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
            {/* Native colour picker */}
            <input
              type="color"
              value={appearance.accent}
              onChange={handleColorPick}
              style={{
                width: 38, height: 38, borderRadius: 4, cursor: "pointer",
                border: "1px solid var(--border)", padding: 2,
                background: "var(--surface-raised)",
              }}
            />
            {/* Hex text input */}
            <div style={{
              display: "flex", alignItems: "center",
              background: "var(--surface-raised)", border: "1px solid var(--border)",
              borderRadius: 4, overflow: "hidden",
            }}>
              <span style={{ padding: "8px 6px 8px 10px", color: "var(--text-faint)", fontSize: 13, userSelect: "none" }}>#</span>
              <input
                type="text"
                value={hexDraft.replace(/^#/, "")}
                onChange={handleHexInput}
                onBlur={handleHexBlur}
                maxLength={6}
                spellCheck={false}
                style={{
                  background: "transparent", border: "none", outline: "none",
                  color: "var(--text)", fontSize: 13, padding: "8px 10px 8px 0",
                  width: 74, fontFamily: "monospace", textTransform: "uppercase",
                }}
              />
            </div>
            {/* Colour swatch */}
            <div style={{
              width: 38, height: 38, borderRadius: 4,
              background: appearance.accent,
              border: "1px solid var(--border)", flexShrink: 0,
            }} />
          </div>

          {/* Preview strip */}
          <div style={{
            background: "var(--surface-raised)", border: "1px solid var(--border)",
            borderRadius: 6, padding: "14px 18px", marginBottom: 24,
          }}>
            <p style={{ fontSize: 10, color: "var(--text-faint)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 12 }}>Preview</p>
            <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
              <button style={{ background: appearance.accent, color: "var(--primary-foreground)", border: "none", borderRadius: 4, fontSize: 11, fontWeight: 700, padding: "7px 16px" }}>ASSIGN</button>
              <span style={{ background: appearance.accent, color: "var(--primary-foreground)", fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 4 }}>3</span>
              <span style={{ color: appearance.accent, fontSize: 12 }}>● Active</span>
              <span style={{ color: "var(--text)", fontSize: 12.5, fontWeight: 600, borderBottom: `2px solid ${appearance.accent}`, paddingBottom: 2 }}>Dispatch Centre</span>
            </div>
          </div>

          <div style={{ borderTop: "1px solid var(--border)", marginBottom: 24 }} />

          {/* Row 3: Text Size */}
          <p style={subsectionTitle}>Text Size</p>
          <p style={hint}>Adjusts the scale of all UI text and elements.</p>
          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" style={toggleBtn(fontSize === "small")}  onClick={() => setFontSize("small")}>Small</button>
            <button type="button" style={toggleBtn(fontSize === "medium")} onClick={() => setFontSize("medium")}>Medium</button>
            <button type="button" style={toggleBtn(fontSize === "large")}  onClick={() => setFontSize("large")}>Large</button>
          </div>

        </div>
      </section>

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
            <PhoneInput
              label="Contact Phone (WhatsApp)"
              value={form.contactPhone ?? ""}
              onChange={(e164) => set("contactPhone", e164)}
            />
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

      {/* Save Settings — commits company + timezone + accent to DB */}
      <div style={{ borderTop: "1px solid var(--border)", paddingTop: 24, display: "flex", alignItems: "center", gap: 16 }}>
        <button
          onClick={handleSave}
          disabled={!hasAnyChanges || saving}
          title={!hasAnyChanges ? "No changes to save" : undefined}
          style={{
            background: hasAnyChanges && !saving ? "var(--accent)" : "var(--surface-raised)",
            border: "none", borderRadius: 4,
            color: hasAnyChanges && !saving ? "var(--primary-foreground)" : "var(--text-faint)",
            fontSize: 13, fontWeight: 700, padding: "10px 28px",
            cursor: hasAnyChanges && !saving ? "pointer" : "not-allowed",
          }}
        >
          {saving ? "Saving…" : "Save Settings"}
        </button>
        {saveStatus === "success" && (
          <span style={{ fontSize: 13, color: "var(--accent-color)" }}>✓ Settings saved</span>
        )}
        {saveStatus === "error" && (
          <span style={{ fontSize: 13, color: "#ef4444" }}>✗ {errorMsg}</span>
        )}
      </div>
    </div>
  );
}
