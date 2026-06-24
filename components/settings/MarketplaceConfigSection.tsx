"use client";

import { useState } from "react";
import { calculateMarketplaceFee } from "@/lib/utils/marketplace";

type ConfigRow = {
  key: string;
  value: string;
  updatedAt: string;
  updatedByName: string | null;
};

function fmtSGT(iso: string) {
  return new Date(iso).toLocaleString("en-SG", {
    timeZone: "Asia/Singapore",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function FieldMeta({ updatedAt, updatedByName }: { updatedAt: string; updatedByName: string | null }) {
  return (
    <p style={{ fontSize: 11, color: "var(--text-faint)", marginTop: 6 }}>
      Last updated {fmtSGT(updatedAt)}{updatedByName ? ` by ${updatedByName}` : ""}
    </p>
  );
}

export function MarketplaceConfigSection({ configs }: { configs: ConfigRow[] }) {
  const getVal = (key: string) => configs.find((c) => c.key === key);

  const takeRateRow  = getVal("marketplace_take_rate_percent");
  const floorRateRow = getVal("marketplace_floor_rate_sgd");

  const [takeRate,  setTakeRate]  = useState(takeRateRow?.value  ?? "12");
  const [floorRate, setFloorRate] = useState(floorRateRow?.value ?? "3");
  const [previewFare, setPreviewFare] = useState("50");

  const [takeRateError,  setTakeRateError]  = useState<string | null>(null);
  const [floorRateError, setFloorRateError] = useState<string | null>(null);

  const [saving,    setSaving]    = useState(false);
  const [savedAt,   setSavedAt]   = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Live fee preview
  const previewFareNum  = parseFloat(previewFare)  || 0;
  const takeRateNum     = parseFloat(takeRate)      || 0;
  const floorRateNum    = parseFloat(floorRate)     || 0;
  const preview = previewFareNum > 0 && takeRateNum > 0
    ? calculateMarketplaceFee(previewFareNum, takeRateNum, floorRateNum)
    : null;

  function validateTakeRate(v: string) {
    const n = parseFloat(v);
    if (isNaN(n))          { setTakeRateError("Must be a number"); return false; }
    if (n < 1 || n > 30)  { setTakeRateError("Must be between 1% and 30%"); return false; }
    if (!/^\d+(\.\d{1,2})?$/.test(String(n))) { setTakeRateError("At most 2 decimal places"); return false; }
    setTakeRateError(null);
    return true;
  }

  function validateFloorRate(v: string) {
    const n = parseFloat(v);
    if (isNaN(n))          { setFloorRateError("Must be a number"); return false; }
    if (n < 0 || n > 50)  { setFloorRateError("Must be between SGD 0 and SGD 50"); return false; }
    if (!/^\d+(\.\d{1,2})?$/.test(String(n))) { setFloorRateError("At most 2 decimal places"); return false; }
    setFloorRateError(null);
    return true;
  }

  async function handleSave() {
    const trValid = validateTakeRate(takeRate);
    const flValid = validateFloorRate(floorRate);
    if (!trValid || !flValid) return;

    setSaving(true);
    setSaveError(null);
    setSavedAt(null);

    const original = {
      marketplace_take_rate_percent: takeRateRow?.value,
      marketplace_floor_rate_sgd:    floorRateRow?.value,
    };

    const changes: { key: string; value: string }[] = [];
    if (takeRate  !== original.marketplace_take_rate_percent) changes.push({ key: "marketplace_take_rate_percent", value: takeRate });
    if (floorRate !== original.marketplace_floor_rate_sgd)    changes.push({ key: "marketplace_floor_rate_sgd",    value: floorRate });

    for (const change of changes) {
      const res = await fetch("/api/admin/config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(change),
      });
      if (!res.ok) {
        const d = await res.json();
        setSaveError(d.error ?? "Failed to save");
        setSaving(false);
        return;
      }
    }

    setSaving(false);
    setSavedAt(new Date().toISOString());
  }

  const labelStyle: React.CSSProperties = { fontSize: 13, fontWeight: 600, color: "var(--text)", marginBottom: 4, display: "block" };
  const descStyle:  React.CSSProperties = { fontSize: 12, color: "var(--text-dim)", marginBottom: 10, lineHeight: 1.5 };
  const inputWrap:  React.CSSProperties = { display: "flex", alignItems: "center", gap: 8 };
  const inputStyle: React.CSSProperties = {
    width: 80, background: "var(--surface-raised)", border: "1px solid var(--border)",
    borderRadius: 6, padding: "8px 10px", fontSize: 14, color: "var(--text)",
    outline: "none", textAlign: "right", fontVariantNumeric: "tabular-nums",
  };
  const unitStyle: React.CSSProperties = { fontSize: 13, color: "var(--text-dim)", fontWeight: 500 };
  const errorStyle: React.CSSProperties = { fontSize: 11, color: "#ef4444", marginTop: 4 };

  return (
    <div style={{ marginTop: 32 }}>
      <div style={{ borderTop: "1px solid var(--border)", paddingTop: 32 }}>
        <p style={{ fontSize: 11, color: "var(--text-faint)", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: 6 }}>
          Marketplace Configuration
        </p>
        <p style={{ fontSize: 12, color: "var(--text-dim)", lineHeight: 1.6, marginBottom: 28 }}>
          These settings apply to all LyPX Direct marketplace trips. Changes take effect on the next trip created after saving.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
          {/* Take Rate */}
          <div>
            <label style={labelStyle}>Take Rate</label>
            <p style={descStyle}>
              The percentage LyPX retains from each LyPX Direct trip fare. Operators receive the remainder.
            </p>
            <div style={inputWrap}>
              <input
                type="number"
                value={takeRate}
                min={1}
                max={30}
                step={0.01}
                onChange={(e) => { setTakeRate(e.target.value); validateTakeRate(e.target.value); setSavedAt(null); }}
                style={{ ...inputStyle, borderColor: takeRateError ? "#ef4444" : "var(--border)" }}
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
            <p style={descStyle}>
              Minimum LyPX fee per trip. Applied when the percentage calculation falls below this amount.
            </p>
            <div style={inputWrap}>
              <span style={unitStyle}>SGD</span>
              <input
                type="number"
                value={floorRate}
                min={0}
                max={50}
                step={0.01}
                onChange={(e) => { setFloorRate(e.target.value); validateFloorRate(e.target.value); setSavedAt(null); }}
                style={{ ...inputStyle, borderColor: floorRateError ? "#ef4444" : "var(--border)" }}
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
                min={0}
                step={1}
                onChange={(e) => setPreviewFare(e.target.value)}
                style={{ ...inputStyle, width: 70 }}
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
                      : `floor applied`})
                  </span>
                  {" "}= <strong style={{ color: "var(--gold)" }}>SGD {preview.lypxFee.toFixed(2)}</strong>
                </div>
                <div>
                  Operator receives = <strong>SGD {preview.operatorReceives.toFixed(2)}</strong>
                </div>
              </div>
            ) : (
              <p style={{ fontSize: 13, color: "var(--text-faint)" }}>Enter a trip fare above to see the breakdown.</p>
            )}
          </div>

          {/* Save */}
          {saveError && (
            <div style={{ background: "#ef444422", border: "1px solid #ef4444", borderRadius: 6, padding: "10px 14px", color: "#ef4444", fontSize: 13 }}>
              {saveError}
            </div>
          )}
          {savedAt && (
            <div style={{ background: "#22c55e11", border: "1px solid #22c55e44", borderRadius: 6, padding: "10px 14px", color: "#22c55e", fontSize: 13 }}>
              Marketplace config saved — {fmtSGT(savedAt)}
            </div>
          )}
          <button
            onClick={handleSave}
            disabled={saving || !!takeRateError || !!floorRateError}
            className="btn-primary"
            style={{ alignSelf: "flex-start", padding: "10px 24px", fontSize: 13 }}
          >
            {saving ? "Saving…" : "Save Marketplace Config"}
          </button>
        </div>
      </div>
    </div>
  );
}
