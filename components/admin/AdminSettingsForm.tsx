"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { BgMode, applyTheme, getStoredTheme, saveTheme, DEFAULT_ACCENT } from "@/lib/utils/theme";
import { calculateMarketplaceFee } from "@/lib/utils/marketplace";
import { formatTZ, SUPPORTED_TIMEZONES } from "@/lib/utils/date";

const ADMIN_TENANT_ID = "lypx_direct";

type ConfigRow = {
  key: string;
  value: string;
  updatedAt: string;
  updatedByName: string | null;
};

function isValidHex(h: string) {
  return /^#[0-9a-fA-F]{6}$/.test(h);
}

function fmtSGT(iso: string) {
  return formatTZ(iso, "Asia/Singapore", { dateStyle: "medium", timeStyle: "short" });
}

function FieldMeta({ updatedAt, updatedByName }: { updatedAt: string; updatedByName: string | null }) {
  return (
    <p style={{ fontSize: 11, color: "var(--text-faint)", marginTop: 6 }}>
      Last updated {fmtSGT(updatedAt)}{updatedByName ? ` by ${updatedByName}` : ""}
    </p>
  );
}

interface Props {
  currentTimezone: string;
  configs: ConfigRow[];
}

export function AdminSettingsForm({ currentTimezone, configs }: Props) {
  const router = useRouter();

  // ── Appearance ───────────────────────────────────────────────────────────
  const [bg, setBg]           = useState<BgMode>("dark");
  const [accent, setAccent]   = useState(DEFAULT_ACCENT);
  const [hexDraft, setHexDraft] = useState(DEFAULT_ACCENT);
  const [savedBg, setSavedBg]     = useState<BgMode>("dark");
  const [savedAccent, setSavedAccent] = useState(DEFAULT_ACCENT);

  useEffect(() => {
    const stored = getStoredTheme(ADMIN_TENANT_ID);
    if (stored) {
      setBg(stored.bg);      setSavedBg(stored.bg);
      setAccent(stored.accent); setSavedAccent(stored.accent);
      setHexDraft(stored.accent);
      applyTheme(stored.bg, stored.accent);
    }
  }, []);

  useEffect(() => {
    applyTheme(bg, accent);
  }, [bg, accent]);

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

  const hasAppearanceChanges = bg !== savedBg || accent !== savedAccent;

  // ── Timezone ─────────────────────────────────────────────────────────────
  const [timezone, setTimezone] = useState(currentTimezone);
  const hasTimezoneChanges = timezone !== currentTimezone;

  // ── Marketplace Config ───────────────────────────────────────────────────
  const takeRateRow  = configs.find(c => c.key === "marketplace_take_rate_percent");
  const floorRateRow = configs.find(c => c.key === "marketplace_floor_rate_sgd");

  const [takeRate,  setTakeRate]  = useState(takeRateRow?.value  ?? "12");
  const [floorRate, setFloorRate] = useState(floorRateRow?.value ?? "3");
  const [savedTakeRate,  setSavedTakeRate]  = useState(takeRateRow?.value  ?? "12");
  const [savedFloorRate, setSavedFloorRate] = useState(floorRateRow?.value ?? "3");
  const [takeRateError,  setTakeRateError]  = useState<string | null>(null);
  const [floorRateError, setFloorRateError] = useState<string | null>(null);
  const [previewFare, setPreviewFare] = useState("50");

  const hasMarketplaceChanges = takeRate !== savedTakeRate || floorRate !== savedFloorRate;

  const previewFareNum = parseFloat(previewFare)  || 0;
  const takeRateNum    = parseFloat(takeRate)      || 0;
  const floorRateNum   = parseFloat(floorRate)     || 0;
  const preview = previewFareNum > 0 && takeRateNum > 0
    ? calculateMarketplaceFee(previewFareNum, takeRateNum, floorRateNum)
    : null;

  function validateTakeRate(v: string) {
    const n = parseFloat(v);
    if (isNaN(n))         { setTakeRateError("Must be a number"); return false; }
    if (n < 1 || n > 30) { setTakeRateError("Must be between 1% and 30%"); return false; }
    if (!/^\d+(\.\d{1,2})?$/.test(String(n))) { setTakeRateError("At most 2 decimal places"); return false; }
    setTakeRateError(null);
    return true;
  }

  function validateFloorRate(v: string) {
    const n = parseFloat(v);
    if (isNaN(n))         { setFloorRateError("Must be a number"); return false; }
    if (n < 0 || n > 50) { setFloorRateError("Must be between SGD 0 and SGD 50"); return false; }
    if (!/^\d+(\.\d{1,2})?$/.test(String(n))) { setFloorRateError("At most 2 decimal places"); return false; }
    setFloorRateError(null);
    return true;
  }

  // ── Save ─────────────────────────────────────────────────────────────────
  const hasAnyChanges = hasAppearanceChanges || hasTimezoneChanges || hasMarketplaceChanges;
  const [saving,     setSaving]     = useState(false);
  const [saveStatus, setSaveStatus] = useState<"success" | "error" | null>(null);
  const [errorMsg,   setErrorMsg]   = useState<string | null>(null);

  useEffect(() => {
    if (saveStatus === "success") {
      const t = setTimeout(() => setSaveStatus(null), 2000);
      return () => clearTimeout(t);
    }
  }, [saveStatus]);

  async function handleSave() {
    if (hasMarketplaceChanges) {
      const trOk = validateTakeRate(takeRate);
      const flOk = validateFloorRate(floorRate);
      if (!trOk || !flOk) return;
    }

    setSaving(true);
    setSaveStatus(null);
    setErrorMsg(null);
    const errors: string[] = [];

    if (hasAppearanceChanges) {
      saveTheme(bg, accent, ADMIN_TENANT_ID);
      setSavedBg(bg);
      setSavedAccent(accent);
    }

    if (hasTimezoneChanges) {
      const res = await fetch("/api/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ timezone }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        errors.push(d.error ?? "Failed to save timezone");
      }
    }

    if (hasMarketplaceChanges) {
      const changes: { key: string; value: string }[] = [];
      if (takeRate  !== savedTakeRate)  changes.push({ key: "marketplace_take_rate_percent", value: takeRate });
      if (floorRate !== savedFloorRate) changes.push({ key: "marketplace_floor_rate_sgd",    value: floorRate });

      for (const change of changes) {
        const res = await fetch("/api/admin/config", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(change),
        });
        if (!res.ok) {
          const d = await res.json().catch(() => ({}));
          errors.push(d.error ?? `Failed to save ${change.key}`);
        }
      }
    }

    setSaving(false);

    if (errors.length > 0) {
      setErrorMsg(errors.join(" · "));
      setSaveStatus("error");
    } else {
      setSavedTakeRate(takeRate);
      setSavedFloorRate(floorRate);
      setSaveStatus("success");
      if (hasTimezoneChanges) router.refresh();
    }
  }

  // ── Shared styles ─────────────────────────────────────────────────────────
  const sectionLabel: React.CSSProperties = {
    fontSize: 11, color: "var(--text-faint)", fontWeight: 500,
    textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: 12,
  };
  const card: React.CSSProperties = {
    background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, padding: 24,
  };
  const subsectionTitle: React.CSSProperties = {
    fontSize: 11, fontWeight: 700, color: "var(--text-dim)",
    textTransform: "uppercase", letterSpacing: "0.7px", marginBottom: 6,
  };
  const hint: React.CSSProperties = { fontSize: 13, color: "var(--text-faint)", marginBottom: 14 };
  const toggleBtn = (active: boolean): React.CSSProperties => ({
    background: active ? "var(--accent-color)" : "var(--surface-raised)",
    border: `1px solid ${active ? "var(--accent-color)" : "var(--border)"}`,
    borderRadius: 4,
    color: active ? "var(--primary-foreground)" : "var(--text-dim)",
    fontSize: 12, fontWeight: active ? 700 : 500,
    padding: "7px 20px", cursor: "pointer",
  });
  const labelStyle: React.CSSProperties = { fontSize: 13, fontWeight: 600, color: "var(--text)", marginBottom: 4, display: "block" };
  const descStyle:  React.CSSProperties = { fontSize: 12, color: "var(--text-dim)", marginBottom: 10, lineHeight: 1.5 };
  const numInputStyle: React.CSSProperties = {
    width: 80, background: "var(--surface-raised)", border: "1px solid var(--border)",
    borderRadius: 6, padding: "8px 10px", fontSize: 14, color: "var(--text)",
    outline: "none", textAlign: "right", fontVariantNumeric: "tabular-nums",
  };
  const unitStyle: React.CSSProperties = { fontSize: 13, color: "var(--text-dim)", fontWeight: 500 };
  const errorStyle: React.CSSProperties = { fontSize: 11, color: "#ef4444", marginTop: 4 };

  return (
    <div>
      {/* ── Appearance ──────────────────────────────────────────────────── */}
      <section style={{ marginBottom: 32 }}>
        <p style={sectionLabel}>Appearance</p>
        <div style={card}>

          <p style={subsectionTitle}>Background</p>
          <p style={hint}>Choose between dark and light console background.</p>
          <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
            <button type="button" style={toggleBtn(bg === "dark")}  onClick={() => setBg("dark")}>Dark</button>
            <button type="button" style={toggleBtn(bg === "light")} onClick={() => setBg("light")}>Light</button>
          </div>

          <div style={{ borderTop: "1px solid var(--border)", marginBottom: 24 }} />

          <p style={subsectionTitle}>Brand Colour</p>
          <p style={hint}>Pick your brand colour. Changes apply instantly across the Admin Console.</p>
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
            <div style={{ width: 38, height: 38, borderRadius: 4, background: accent, border: "1px solid var(--border)", flexShrink: 0 }} />
          </div>

          {/* Preview strip */}
          <div style={{
            background: "var(--surface-raised)", border: "1px solid var(--border)",
            borderRadius: 6, padding: "14px 18px",
          }}>
            <p style={{ fontSize: 10, color: "var(--text-faint)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 12 }}>Preview</p>
            <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
              <button style={{ background: accent, color: "var(--primary-foreground)", border: "none", borderRadius: 4, fontSize: 11, fontWeight: 700, padding: "7px 16px" }}>ACTION</button>
              <span style={{ background: accent, color: "var(--primary-foreground)", fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 4 }}>5</span>
              <span style={{ color: accent, fontSize: 12 }}>● Active</span>
              <span style={{ color: "var(--text-primary)", fontSize: 12.5, fontWeight: 600, borderBottom: `2px solid ${accent}`, paddingBottom: 2 }}>Compliance Queue</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── Display ─────────────────────────────────────────────────────── */}
      <section style={{ marginBottom: 32 }}>
        <p style={sectionLabel}>Display</p>
        <div style={card}>
          <p style={subsectionTitle}>Timezone</p>
          <p style={hint}>All timestamps in the Admin Console will display in this timezone. Dates are stored in UTC — only the display changes.</p>
          <select
            value={timezone}
            onChange={e => setTimezone(e.target.value)}
            style={{
              background: "var(--surface-raised)", border: "1px solid var(--border)",
              borderRadius: 4, color: "var(--text-primary)", fontSize: 13,
              padding: "8px 10px", width: "100%", cursor: "pointer", outline: "none",
            }}
          >
            {SUPPORTED_TIMEZONES.map(tz => (
              <option key={tz.value} value={tz.value}>{tz.label}</option>
            ))}
          </select>
        </div>
      </section>

      {/* ── Marketplace Config ──────────────────────────────────────────── */}
      <section style={{ marginBottom: 32, borderTop: "1px solid var(--border)", paddingTop: 32 }}>
        <p style={sectionLabel}>Marketplace Configuration</p>
        <p style={{ fontSize: 12, color: "var(--text-dim)", lineHeight: 1.6, marginBottom: 28 }}>
          These settings apply to all LyPX Direct marketplace trips. Changes take effect on the next trip created after saving.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
          {/* Take Rate */}
          <div>
            <label style={labelStyle}>Take Rate</label>
            <p style={descStyle}>The percentage LyPX retains from each LyPX Direct trip fare. Operators receive the remainder.</p>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input
                type="number"
                value={takeRate}
                min={1} max={30} step={0.01}
                onChange={e => { setTakeRate(e.target.value); validateTakeRate(e.target.value); }}
                style={{ ...numInputStyle, borderColor: takeRateError ? "#ef4444" : "var(--border)" }}
              />
              <span style={unitStyle}>%</span>
            </div>
            {takeRateError && <p style={errorStyle}>{takeRateError}</p>}
            <p style={{ fontSize: 11, color: "var(--text-faint)", marginTop: 4 }}>Allowed range: 1% – 30%</p>
            {takeRateRow && <FieldMeta updatedAt={takeRateRow.updatedAt} updatedByName={takeRateRow.updatedByName} />}
          </div>

          {/* Floor Rate */}
          <div>
            <label style={labelStyle}>Floor Rate (SGD)</label>
            <p style={descStyle}>Minimum LyPX fee per trip. Applied when the percentage calculation falls below this amount.</p>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={unitStyle}>SGD</span>
              <input
                type="number"
                value={floorRate}
                min={0} max={50} step={0.01}
                onChange={e => { setFloorRate(e.target.value); validateFloorRate(e.target.value); }}
                style={{ ...numInputStyle, borderColor: floorRateError ? "#ef4444" : "var(--border)" }}
              />
            </div>
            {floorRateError && <p style={errorStyle}>{floorRateError}</p>}
            <p style={{ fontSize: 11, color: "var(--text-faint)", marginTop: 4 }}>Allowed range: SGD 0 – SGD 50</p>
            {floorRateRow && <FieldMeta updatedAt={floorRateRow.updatedAt} updatedByName={floorRateRow.updatedByName} />}
          </div>

          {/* Fee Preview */}
          <div style={{ background: "var(--surface-raised)", border: "1px solid var(--border)", borderRadius: 8, padding: "16px 20px" }}>
            <p style={{ fontSize: 11, color: "var(--text-faint)", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 12 }}>
              Fee Preview
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <span style={{ fontSize: 13, color: "var(--text-dim)" }}>For a SGD</span>
              <input
                type="number"
                value={previewFare}
                min={0} step={1}
                onChange={e => setPreviewFare(e.target.value)}
                style={{ ...numInputStyle, width: 70 }}
              />
              <span style={{ fontSize: 13, color: "var(--text-dim)" }}>trip:</span>
            </div>
            {preview ? (
              <div style={{ fontSize: 13, color: "var(--text)", lineHeight: 2 }}>
                <div>
                  LyPX fee{" "}
                  <span style={{ color: "var(--text-dim)", fontSize: 11 }}>
                    ({preview.rateApplied === "percentage"
                      ? `${takeRateNum}% of SGD ${previewFareNum}`
                      : "floor applied"})
                  </span>
                  {" "}= <strong style={{ color: "var(--gold)" }}>SGD {preview.lypxFee.toFixed(2)}</strong>
                </div>
                <div>Operator receives = <strong>SGD {preview.operatorReceives.toFixed(2)}</strong></div>
              </div>
            ) : (
              <p style={{ fontSize: 13, color: "var(--text-faint)" }}>Enter a trip fare above to see the breakdown.</p>
            )}
          </div>
        </div>
      </section>

      {/* ── Save Settings ────────────────────────────────────────────────── */}
      <div style={{ borderTop: "1px solid var(--border)", paddingTop: 24, display: "flex", alignItems: "center", gap: 16 }}>
        <button
          onClick={handleSave}
          disabled={!hasAnyChanges || saving || !!takeRateError || !!floorRateError}
          title={!hasAnyChanges ? "No changes to save" : undefined}
          style={{
            background: hasAnyChanges && !saving ? "var(--accent-color)" : "var(--surface-raised)",
            border: "none", borderRadius: 4,
            color: hasAnyChanges && !saving ? "var(--primary-foreground)" : "var(--text-faint)",
            fontSize: 13, fontWeight: 700, padding: "10px 28px",
            cursor: hasAnyChanges && !saving && !takeRateError && !floorRateError ? "pointer" : "not-allowed",
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
