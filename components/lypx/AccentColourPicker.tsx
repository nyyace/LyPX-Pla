"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { applyAccent, computeAccentDim, getStoredTheme, saveTheme } from "@/lib/utils/theme";

function isValidHex(h: string): boolean {
  return /^#[0-9a-fA-F]{6}$/.test(h);
}

interface Props {
  tenantId: string;
  currentAccent: string;
  saveLabel?: string;
}

export function AccentColourPicker({ tenantId, currentAccent, saveLabel = "Save Colour" }: Props) {
  const router = useRouter();
  const [accent, setAccent] = useState(currentAccent);
  const [savedAccent, setSavedAccent] = useState(currentAccent);
  const [hexDraft, setHexDraft] = useState(currentAccent);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const hasChanges = accent !== savedAccent;
  const previewDim = computeAccentDim(accent);

  // Sync with stored theme on mount
  useEffect(() => {
    const stored = getStoredTheme(tenantId);
    if (stored?.accent) {
      setAccent(stored.accent);
      setSavedAccent(stored.accent);
      setHexDraft(stored.accent);
    }
  }, [tenantId]);

  useEffect(() => {
    applyAccent(accent);
  }, [accent]);

  function handleColorPick(e: React.ChangeEvent<HTMLInputElement>) {
    const hex = e.target.value;
    setHexDraft(hex);
    setAccent(hex);
  }

  function handleHexInput(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value.replace(/[^0-9a-fA-F]/g, "");
    setHexDraft("#" + raw);
    if (raw.length === 6) setAccent("#" + raw);
  }

  function handleHexBlur() {
    if (!isValidHex(hexDraft)) setHexDraft(accent);
  }

  async function save() {
    setSaving(true);
    setSaveError(null);
    const res = await fetch(`/api/operators/${tenantId}/preferences`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accentColour: accent }),
    });
    setSaving(false);
    if (res.ok) {
      setSavedAccent(accent);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      const bg = getStoredTheme(tenantId)?.bg ?? "dark";
      saveTheme(bg, accent, tenantId);
      router.refresh();
    } else {
      const d = await res.json().catch(() => ({}));
      setSaveError(d.error ?? "Failed to save");
    }
  }

  return (
    <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, padding: 24 }}>
      <p style={{ fontSize: 11, fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.7px", marginBottom: 6 }}>
        Brand Accent Colour
      </p>
      <p style={{ fontSize: 13, color: "var(--text-faint)", marginBottom: 20 }}>
        Choose one colour to represent your brand.
      </p>

      {/* Colour picker + hex input + swatch */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
        <input
          type="color"
          value={accent}
          onChange={handleColorPick}
          style={{
            width: 38, height: 38, borderRadius: 4, cursor: "pointer",
            border: "1px solid var(--border)", padding: 2,
            background: "var(--surface-raised)",
          }}
        />
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
        <div style={{
          width: 38, height: 38, borderRadius: 4,
          background: accent, border: "1px solid var(--border)", flexShrink: 0,
        }} />
      </div>

      {/* Live preview */}
      <div style={{ background: "var(--surface-raised)", border: "1px solid var(--border)", borderRadius: 6, padding: "16px 20px", marginBottom: 20 }}>
        <p style={{ fontSize: 10, color: "var(--text-faint)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 14 }}>Preview</p>
        <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          <button style={{ background: accent, color: "#1A1305", border: "none", borderRadius: 4, fontSize: 11, fontWeight: 700, padding: "7px 16px" }}>ASSIGN</button>
          <span style={{ background: accent, color: "#1A1305", fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 4 }}>3</span>
          <span style={{ color: accent, fontSize: 12 }}>● Active</span>
          <span style={{ color: "var(--text)", fontSize: 12.5, fontWeight: 600, borderBottom: `2px solid ${accent}`, paddingBottom: 2 }}>Dispatch Centre</span>
          <div style={{
            width: 28, height: 28, borderRadius: "50%",
            background: `conic-gradient(${accent} 60%, var(--surface) 0)`,
            display: "flex", alignItems: "center", justifyContent: "center", position: "relative",
          }}>
            <div style={{ width: 20, height: 20, borderRadius: "50%", background: "var(--bg)", position: "absolute" }} />
            <span className="mono" style={{ fontSize: 7, fontWeight: 700, color: accent, position: "relative", zIndex: 1 }}>OTW</span>
          </div>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <button
          onClick={save}
          disabled={!hasChanges || saving}
          style={{
            background: saved ? "rgba(76,175,109,0.2)" : hasChanges && !saving ? accent : "var(--surface-raised)",
            border: saved ? "1px solid rgba(76,175,109,0.4)" : "none",
            borderRadius: 4,
            color: saved ? "#4CAF6D" : hasChanges && !saving ? "#1A1305" : "var(--text-faint)",
            fontSize: 13, fontWeight: 700, padding: "10px 24px",
            cursor: hasChanges && !saving ? "pointer" : "not-allowed",
            transition: "background 0.3s ease",
          }}>
          {saved ? "✓ Saved" : saving ? "Saving…" : saveLabel}
        </button>
        {saveError && (
          <span style={{ fontSize: 12, color: "#ef4444" }}>✗ {saveError}</span>
        )}
      </div>

      {/* dim swatch for reference */}
      <div style={{ marginTop: 16, display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ width: 16, height: 16, borderRadius: 3, background: previewDim, border: "1px solid var(--border)" }} />
        <span style={{ fontSize: 11, color: "var(--text-faint)", fontFamily: "monospace" }}>{previewDim.toUpperCase()} dim</span>
      </div>
    </div>
  );
}
