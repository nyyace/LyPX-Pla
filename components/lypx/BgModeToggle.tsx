"use client";

import { useState, useEffect } from "react";
import {
  applyBackground,
  getStoredTheme,
  saveTheme,
  DEFAULT_ACCENT,
  DARK_TOKENS,
  LIGHT_TOKENS,
  type BgMode,
} from "@/lib/utils/theme";

function luminance(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const lin = (c: number) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

function contrastRatio(hex1: string, hex2: string): number {
  const l1 = luminance(hex1);
  const l2 = luminance(hex2);
  const hi = Math.max(l1, l2);
  const lo = Math.min(l1, l2);
  return (hi + 0.05) / (lo + 0.05);
}

interface Props {
  tenantId: string;
}

export function BgModeToggle({ tenantId }: Props) {
  const [mode, setMode] = useState<BgMode>("dark");

  useEffect(() => {
    const stored = getStoredTheme(tenantId);
    if (stored?.bg) setMode(stored.bg);
  }, [tenantId]);

  function toggle(next: BgMode) {
    const stored = getStoredTheme(tenantId);
    const accent = stored?.accent ?? DEFAULT_ACCENT;
    applyBackground(next);
    saveTheme(next, accent, tenantId);
    setMode(next);
  }

  const bgHex = mode === "dark" ? DARK_TOKENS["--bg"] : LIGHT_TOKENS["--bg"];
  const textHex = mode === "dark" ? DARK_TOKENS["--text"] : LIGHT_TOKENS["--text"];
  const ratio = contrastRatio(bgHex, textHex);
  const wcag = ratio >= 7 ? "AAA" : ratio >= 4.5 ? "AA" : "Fail";
  const wcagColor = wcag === "AAA" ? "#4CAF6D" : wcag === "AA" ? "#E5A93C" : "#D9534F";
  const wcagBg = wcag === "AAA" ? "rgba(76,175,109,0.15)" : wcag === "AA" ? "rgba(229,169,60,0.15)" : "rgba(217,83,79,0.15)";
  const wcagBorder = wcag === "AAA" ? "rgba(76,175,109,0.3)" : wcag === "AA" ? "rgba(229,169,60,0.3)" : "rgba(217,83,79,0.3)";

  return (
    <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, padding: 24, marginBottom: 16 }}>
      <p style={{ fontSize: 11, fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.7px", marginBottom: 6 }}>
        Background Mode
      </p>
      <p style={{ fontSize: 13, color: "var(--text-faint)", marginBottom: 20 }}>
        Choose between dark and light interface.
      </p>

      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {(["dark", "light"] as BgMode[]).map(m => (
          <button
            key={m}
            onClick={() => toggle(m)}
            style={{
              padding: "9px 20px",
              borderRadius: 4,
              border: mode === m ? "1.5px solid var(--accent)" : "1px solid var(--border)",
              background: mode === m ? "var(--accent-dim)" : "var(--surface-raised)",
              color: mode === m ? "var(--accent)" : "var(--text-dim)",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
          >
            {m === "dark" ? "☾ Dark" : "☀ Light"}
          </button>
        ))}
      </div>

      {/* Menu contrast — auto-computed, not user-selectable */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 6,
          background: bgHex, border: "1px solid var(--border)",
          borderRadius: 4, padding: "5px 12px",
        }}>
          <span style={{ fontSize: 12, color: textHex, fontWeight: 600 }}>Nav</span>
        </div>
        <span style={{ fontSize: 12, color: "var(--text-faint)", fontFamily: "monospace" }}>
          {ratio.toFixed(2)}:1
        </span>
        <span style={{
          fontSize: 10, fontWeight: 700, letterSpacing: "0.3px",
          padding: "2px 7px", borderRadius: 4,
          background: wcagBg, color: wcagColor,
          border: `1px solid ${wcagBorder}`,
        }}>
          WCAG {wcag}
        </span>
        <span style={{ fontSize: 11, color: "var(--text-faint)" }}>auto-computed</span>
      </div>
    </div>
  );
}
