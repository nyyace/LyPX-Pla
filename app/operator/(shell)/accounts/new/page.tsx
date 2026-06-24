"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { isValidUEN } from "@/lib/utils/uen";

export default function NewOperatorAccountPage() {
  const router = useRouter();

  const [companyName, setCompanyName] = useState("");
  const [uen, setUen] = useState("");
  const [picName, setPicName] = useState("");
  const [picWhatsapp, setPicWhatsapp] = useState("+65 ");
  const [noPic, setNoPic] = useState(false);

  const [uenError, setUenError] = useState("");
  const [conflictMessage, setConflictMessage] = useState("");
  const [whatsappError, setWhatsappError] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function validatePhone(val: string): boolean {
    const cleaned = val.replace(/[\s\-()]/g, "").replace(/^\+/, "");
    return /^\d{8,15}$/.test(cleaned);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setUenError("");
    setConflictMessage("");
    setWhatsappError("");
    setError(null);

    if (!companyName.trim()) {
      setError("Company name is required");
      return;
    }
    if (!isValidUEN(uen)) {
      setUenError("Invalid UEN format — e.g. 201234567K");
      return;
    }
    if (!noPic) {
      if (!picName.trim()) {
        setError("Person-in-Charge name is required");
        return;
      }
      if (!validatePhone(picWhatsapp)) {
        setWhatsappError("Enter a valid phone number (e.g. +65 9123 4567)");
        return;
      }
    }

    setSubmitting(true);
    const res = await fetch("/api/operator/accounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: companyName.trim(),
        uen,
        noPic,
        picName: noPic ? null : picName.trim(),
        picWhatsapp: noPic ? null : picWhatsapp.trim(),
      }),
    });
    const data = await res.json();
    setSubmitting(false);

    if (res.status === 202 && data.status === "conflict") {
      setConflictMessage(
        "This UEN is already registered on LyPX. Your request has been submitted for review — LyPX will contact you within 2 business days."
      );
      return;
    }
    if (!res.ok) {
      setError(data.error ?? "Failed to create account");
      return;
    }
    router.push("/operator/accounts");
  }

  const inputStyle: React.CSSProperties = {
    width: "100%",
    background: "var(--surface-raised)",
    border: "1px solid var(--border)",
    borderRadius: 6,
    padding: "9px 12px",
    fontSize: 13,
    color: "var(--text)",
    outline: "none",
    boxSizing: "border-box" as const,
  };
  const labelStyle: React.CSSProperties = {
    fontSize: 12,
    color: "var(--text-dim)",
    fontWeight: 500,
    marginBottom: 6,
    display: "block",
  };

  return (
    <div style={{ padding: "32px 40px", maxWidth: 560 }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: "var(--text)", margin: 0 }}>Add Account</h1>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Company Name */}
        <div style={{ marginBottom: 20 }}>
          <label style={labelStyle}>Company Name <span style={{ color: "#ef4444" }}>*</span></label>
          <input
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            placeholder="e.g. Raffles Hotel Pte Ltd"
            style={inputStyle}
          />
        </div>

        {/* UEN */}
        <div style={{ marginBottom: 20 }}>
          <label style={labelStyle}>UEN <span style={{ color: "#ef4444" }}>*</span></label>
          <input
            value={uen}
            onChange={(e) => { setUen(e.target.value); setUenError(""); setConflictMessage(""); }}
            placeholder="e.g. 201234567K"
            style={{ ...inputStyle, borderColor: uenError || conflictMessage ? "#ef4444" : undefined }}
          />
          <p style={{ fontSize: 11, color: "var(--text-faint)", marginTop: 4 }}>Format: e.g. 201234567K</p>
          {uenError && <p style={{ fontSize: 12, color: "#ef4444", marginTop: 4 }}>{uenError}</p>}
          {conflictMessage && (
            <p style={{ fontSize: 12, color: "#f59e0b", marginTop: 4 }}>⚠ {conflictMessage}</p>
          )}
        </div>

        {/* PIC + WhatsApp — greyed when noPic */}
        <div style={{ opacity: noPic ? 0.5 : 1, pointerEvents: noPic ? "none" : "auto" }}>
          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>
              Person-in-Charge {!noPic && <span style={{ color: "#ef4444" }}>*</span>}
            </label>
            <input
              value={picName}
              onChange={(e) => setPicName(e.target.value)}
              placeholder="Full name of primary contact at this company"
              style={inputStyle}
              disabled={noPic}
            />
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>
              WhatsApp Number {!noPic && <span style={{ color: "#ef4444" }}>*</span>}
            </label>
            <input
              type="tel"
              value={picWhatsapp}
              onChange={(e) => { setPicWhatsapp(e.target.value); setWhatsappError(""); }}
              placeholder="+65 9123 4567"
              style={{ ...inputStyle, borderColor: whatsappError ? "#ef4444" : undefined }}
              disabled={noPic}
            />
            {whatsappError
              ? <p style={{ fontSize: 11, color: "#ef4444", marginTop: 4 }}>{whatsappError}</p>
              : <p style={{ fontSize: 11, color: "var(--text-faint)", marginTop: 4 }}>
                  This number will receive all trip status updates.
                </p>
            }
          </div>
        </div>

        {/* No PIC checkbox */}
        <div style={{ marginBottom: 28 }}>
          <label style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={noPic}
              onChange={(e) => {
                setNoPic(e.target.checked);
                if (e.target.checked) {
                  setPicName("");
                  setPicWhatsapp("");
                } else {
                  setPicWhatsapp("+65 ");
                }
              }}
              style={{ marginTop: 2 }}
            />
            <span style={{ fontSize: 13, color: "var(--text-dim)", lineHeight: 1.5 }}>
              No PIC / WhatsApp available for this account
            </span>
          </label>
        </div>

        <div style={{ borderTop: "1px solid var(--border)", paddingTop: 20 }} />

        {error && (
          <div style={{ background: "#ef444422", border: "1px solid #ef4444", borderRadius: 6, padding: "10px 14px", color: "#ef4444", fontSize: 13, marginBottom: 16, marginTop: 16 }}>
            {error}
          </div>
        )}

        <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
          <button
            type="button"
            onClick={() => router.back()}
            style={{ flex: 1, padding: "10px", background: "none", border: "1px solid var(--border)", borderRadius: 6, color: "var(--text-dim)", fontSize: 13, cursor: "pointer" }}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="btn-primary"
            style={{ flex: 2, padding: "10px", fontSize: 13 }}
          >
            {submitting ? "Creating…" : "Add Account"}
          </button>
        </div>
      </form>
    </div>
  );
}
