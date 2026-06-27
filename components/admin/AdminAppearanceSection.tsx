"use client";

import { useState, useEffect } from "react";
import { BgMode, applyTheme, getStoredTheme, saveTheme, DEFAULT_ACCENT } from "@/lib/utils/theme";

const ADMIN_TENANT_ID = "lypx_direct";

function isValidHex(h: string) {
  return /^#[0-9a-fA-F]{6}$/.test(h);
}

export function AdminAppearanceSection() {
  const [bg, setBg] = useState<BgMode>("dark");
  const [accent, setAccent] = useState(DEFAULT_ACCENT);
  const [hexDraft, setHexDraft] = useState(DEFAULT_ACCENT);
  const [savedBg, setSavedBg] = useState<BgMode>("dark");
  const [savedAccent, setSavedAccent] = useState(DEFAULT_ACCENT);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const stored = getStoredTheme(ADMIN_TENANT_ID);
    if (stored) {
      setBg(stored.bg);
      setSavedBg(stored.bg);
      setAccent(stored.accent);
      setSavedAccent(stored.accent);
      setHexDraft(stored.accent);
    }
  }, []);

  useEffect(() => {
    applyTheme(bg, accent);
  }, [bg, accent]);

  const hasChanges = bg !== savedBg || accent !== savedAccent;

  function handleColorPick(e: React.ChangeEvent<HTMLInputElement>) {
    setHexDraft(e.target.value);
    setAccent(e.target.value);
  }

  function handleHexInput(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value.replace(/[^0-9a-fA-F]/g, "");
    setHexDraft("#" + raw);
    if (raw.length === 6) setAccent("#" + raw);
  }

  function handleHexBlur() {
    if (!isValidHex(hexDraft)) setHexDraft(accent);
  }

  function handleSave() {
    saveTheme(bg, accent, ADMIN_TENANT_ID);
    setSavedBg(bg);
    setSavedAccent(accent);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  const toggleBtn = (active: boolean): React.CSSProperties => ({
    background: active ? "var(--accent-color)" : "var(--surface-raised)",
    border: `1px solid ${active ? "var(--accent-color)" : "var(--border)"}`,
    borderRadius: 4,
    color: active ? "var(--primary-foreground)" : "var(--text-dim)",
    fontSize: 12,
    fontWeight: active ? 700 : 500,
    padding: "7px 20px",
    cursor: "pointer",
  });

  return (
    <section style={{ marginBottom: 32 }}>
      <p style={{
        fontSize: 11, color: "var(--text-faint)", fontWeight: 500,
        textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: 12,
      }}>
        Appearance
      </p>

      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, padding: 24 }}>

        {/* Row 1: Background */}
        <p style={{ fontSize: 11, fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.7px", marginBottom: 6 }}>
          Background
        </p>
        <p style={{ fontSize: 13, color: "var(--text-faint)", marginBottom: 14 }}>
          Choose between dark and light console background.
        </p>
        <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
          <button type="button" style={toggleBtn(bg === "dark")} onClick={() => setBg("dark")}>Dark</button>
          <button type="button" style={toggleBtn(bg === "light")} onClick={() => setBg("light")}>Light</button>
        </div>

        <div style={{ borderTop: "1px solid var(--border)", marginBottom: 24 }} />

        {/* Row 2: Brand Colour */}
        <p style={{ fontSize: 11, fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.7px", marginBottom: 6 }}>
          Brand Colour
        </p>
        <p style={{ fontSize: 13, color: "var(--text-faint)", marginBottom: 14 }}>
          Pick your brand colour. Changes apply instantly across the Admin Console.
        </p>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
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
                color: "var(--text-primary)", fontSize: 13, padding: "8px 10px 8px 0",
                width: 74, fontFamily: "monospace", textTransform: "uppercase",
              }}
            />
          </div>
          <div style={{
            width: 38, height: 38, borderRadius: 4,
            background: accent, border: "1px solid var(--border)", flexShrink: 0,
          }} />
        </div>

        {/* Preview strip */}
        <div style={{
          background: "var(--surface-raised)", border: "1px solid var(--border)",
          borderRadius: 6, padding: "14px 18px", marginBottom: 24,
        }}>
          <p style={{ fontSize: 10, color: "var(--text-faint)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 12 }}>Preview</p>
          <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
            <button style={{ background: accent, color: "var(--primary-foreground)", border: "none", borderRadius: 4, fontSize: 11, fontWeight: 700, padding: "7px 16px" }}>
              ACTION
            </button>
            <span style={{ background: accent, color: "var(--primary-foreground)", fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 4 }}>5</span>
            <span style={{ color: accent, fontSize: 12 }}>● Active</span>
            <span style={{ color: "var(--text-primary)", fontSize: 12.5, fontWeight: 600, borderBottom: `2px solid ${accent}`, paddingBottom: 2 }}>
              Compliance Queue
            </span>
          </div>
        </div>

        {/* Row 3: Save */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button
            type="button"
            onClick={handleSave}
            disabled={!hasChanges}
            style={{
              background: hasChanges ? "var(--accent-color)" : "var(--surface-raised)",
              border: "none", borderRadius: 4,
              color: hasChanges ? "var(--primary-foreground)" : "var(--text-faint)",
              fontSize: 12, fontWeight: 700, padding: "9px 20px",
              cursor: hasChanges ? "pointer" : "not-allowed",
            }}
          >
            Save Preferences
          </button>
          {saved && (
            <span style={{ fontSize: 12, color: "#22c55e" }}>✓ Saved to this device</span>
          )}
        </div>
      </div>
    </section>
  );
}
