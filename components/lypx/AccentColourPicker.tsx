"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { hueToAccent, applyAccent, computeAccentDim } from "@/lib/utils/theme";

interface Props {
  tenantId: string;
  currentAccent: string;
}

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

export function AccentColourPicker({ tenantId, currentAccent }: Props) {
  const router = useRouter();
  const [hue, setHue] = useState(() => hexToHue(currentAccent));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const previewAccent = hueToAccent(hue);
  const previewDim = computeAccentDim(previewAccent);

  useEffect(() => {
    applyAccent(previewAccent);
  }, [previewAccent]);

  async function save() {
    setSaving(true);
    await fetch(`/api/operators/${tenantId}/preferences`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accentColour: previewAccent }),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    router.refresh();
  }

  const spectrumGradient =
    "linear-gradient(to right, hsl(0,75%,60%), hsl(30,75%,60%), hsl(60,75%,60%), hsl(90,75%,60%), hsl(120,75%,60%), hsl(150,75%,60%), hsl(180,75%,60%), hsl(210,75%,60%), hsl(240,75%,60%), hsl(270,75%,60%), hsl(300,75%,60%), hsl(330,75%,60%), hsl(360,75%,60%))";

  return (
    <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, padding: 24 }}>
      <p style={{ fontSize: 11, fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.7px", marginBottom: 6 }}>
        Brand Accent Colour
      </p>
      <p style={{ fontSize: 13, color: "var(--text-faint)", marginBottom: 20 }}>
        Choose one colour to represent your brand. Background will always remain dark.
      </p>

      {/* Hue slider */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ position: "relative", height: 20, borderRadius: 10, background: spectrumGradient, marginBottom: 8 }}>
          <input
            type="range"
            min={0}
            max={360}
            value={hue}
            onChange={e => setHue(parseInt(e.target.value))}
            style={{
              position: "absolute", inset: 0, width: "100%", height: "100%",
              opacity: 0, cursor: "pointer", margin: 0,
            }}
          />
          <div style={{
            position: "absolute",
            left: `calc(${hue / 360 * 100}% - 10px)`,
            top: 0,
            width: 20,
            height: 20,
            borderRadius: "50%",
            border: "2px solid white",
            background: previewAccent,
            boxShadow: "0 1px 4px rgba(0,0,0,0.5)",
            pointerEvents: "none",
          }} />
        </div>
        <p className="mono" style={{ fontSize: 11, color: "var(--text-faint)" }}>
          {previewAccent.toUpperCase()}
        </p>
      </div>

      {/* Live preview */}
      <div style={{ background: "var(--surface-raised)", border: "1px solid var(--border)", borderRadius: 6, padding: "16px 20px", marginBottom: 20 }}>
        <p style={{ fontSize: 10, color: "var(--text-faint)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 14 }}>Preview</p>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          {/* Button */}
          <button style={{
            background: previewAccent, color: "#1A1305", border: "none", borderRadius: 4,
            fontSize: 11, fontWeight: 700, padding: "7px 16px", cursor: "pointer",
          }}>ASSIGN</button>
          {/* Badge */}
          <span style={{
            background: previewAccent, color: "#1A1305", fontSize: 11, fontWeight: 600,
            padding: "2px 8px", borderRadius: 4,
          }}>3</span>
          {/* Active status */}
          <span style={{ color: previewAccent, fontSize: 12 }}>● Active</span>
          {/* Nav tab underline */}
          <span style={{
            color: "var(--text)", fontSize: 12.5, fontWeight: 600,
            borderBottom: `2px solid ${previewAccent}`, paddingBottom: 2,
          }}>Dispatch Centre</span>
          {/* Wheel preview */}
          <div style={{
            width: 28, height: 28, borderRadius: "50%",
            background: `conic-gradient(${previewAccent} 60%, var(--surface) 0)`,
            display: "flex", alignItems: "center", justifyContent: "center",
            position: "relative",
          }}>
            <div style={{ width: 20, height: 20, borderRadius: "50%", background: "var(--bg)", position: "absolute" }} />
            <span className="mono" style={{ fontSize: 7, fontWeight: 700, color: previewAccent, position: "relative", zIndex: 1 }}>OTW</span>
          </div>
        </div>
      </div>

      <button
        onClick={save}
        disabled={saving}
        style={{
          background: saved ? "rgba(76,175,109,0.2)" : previewAccent,
          border: saved ? "1px solid rgba(76,175,109,0.4)" : "none",
          borderRadius: 4,
          color: saved ? "#4CAF6D" : "#1A1305",
          fontSize: 13, fontWeight: 700, padding: "10px 24px", cursor: "pointer",
          transition: "background 0.3s ease",
        }}>
        {saved ? "✓ Saved" : saving ? "Saving…" : "Save Colour"}
      </button>
    </div>
  );
}
