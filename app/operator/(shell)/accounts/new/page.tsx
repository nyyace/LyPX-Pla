"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { isValidUEN } from "@/lib/utils/uen";

type UENStatus = "idle" | "checking" | "clear" | "conflict";

const SEGMENTS = [
  { value: "hotel", label: "Hotel" },
  { value: "mice", label: "MICE" },
  { value: "tdm", label: "TDM" },
  { value: "dmc", label: "DMC" },
  { value: "corporate_general", label: "Corporate General" },
];

export default function NewOperatorAccountPage() {
  const router = useRouter();

  // Step 1 — UEN
  const [companyName, setCompanyName] = useState("");
  const [uen, setUen] = useState("");
  const [uenStatus, setUenStatus] = useState<UENStatus>("idle");
  const [uenMessage, setUenMessage] = useState("");
  const [uenError, setUenError] = useState("");

  // Conflict state
  const [challengerNote, setChallengerNote] = useState("");
  const [conflictSubmitted, setConflictSubmitted] = useState(false);

  // Step 2 — Details
  const [segment, setSegment] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [notes, setNotes] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function checkUEN() {
    setUenError("");
    if (!isValidUEN(uen)) {
      setUenError("Invalid UEN format — e.g. 201234567K");
      return;
    }
    setUenStatus("checking");
    const res = await fetch(`/api/operator/accounts/check-uen?uen=${encodeURIComponent(uen)}`);
    const data = await res.json();
    setUenStatus(data.status === "conflict" ? "conflict" : "clear");
    setUenMessage(data.message ?? "");
  }

  async function submitConflict() {
    setSubmitting(true);
    const res = await fetch("/api/operator/accounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: companyName, uen, customerSegment: "corporate_general", challengerNote }),
    });
    setSubmitting(false);
    if (res.ok) setConflictSubmitted(true);
    else {
      const d = await res.json();
      setError(d.error ?? "Failed to submit request");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!segment) { setError("Please select a customer segment"); return; }
    setError(null);
    setSubmitting(true);
    const res = await fetch("/api/operator/accounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: companyName, uen, customerSegment: segment, contactName, contactEmail, contactPhone, notes }),
    });
    const data = await res.json();
    setSubmitting(false);
    if (!res.ok) { setError(data.error ?? "Failed to create account"); return; }
    router.push("/operator/accounts");
  }

  const inputStyle: React.CSSProperties = { width: "100%", background: "var(--surface-raised)", border: "1px solid var(--border)", borderRadius: 6, padding: "9px 12px", fontSize: 13, color: "var(--text)", outline: "none", boxSizing: "border-box" as const };
  const labelStyle: React.CSSProperties = { fontSize: 12, color: "var(--text-dim)", fontWeight: 500, marginBottom: 6, display: "block" };

  if (conflictSubmitted) {
    return (
      <div style={{ padding: "40px", maxWidth: 520 }}>
        <div style={{ background: "#f59e0b11", border: "1px solid #f59e0b44", borderRadius: 8, padding: "24px 28px" }}>
          <p style={{ fontSize: 16, fontWeight: 600, color: "#f59e0b", marginBottom: 8 }}>Request submitted</p>
          <p style={{ fontSize: 13, color: "var(--text-dim)", lineHeight: 1.6 }}>
            LyPX will review your request and contact you within 2 business days.
          </p>
        </div>
        <button onClick={() => router.push("/operator/accounts")} style={{ marginTop: 20, fontSize: 13, color: "var(--gold)", background: "none", border: "none", cursor: "pointer", padding: 0 }}>
          ← Back to accounts
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: "32px 40px", maxWidth: 580 }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: "var(--text)", margin: 0 }}>Add Account</h1>
        <p style={{ fontSize: 12, color: "var(--text-dim)", marginTop: 4 }}>A 90-day claim will be created on successful onboarding.</p>
      </div>

      {/* Step 1 — UEN Check */}
      <div style={{ marginBottom: 28 }}>
        <p style={{ fontSize: 11, color: "var(--text-faint)", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 16 }}>Step 1 — UEN Check</p>

        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Company Name <span style={{ color: "#ef4444" }}>*</span></label>
          <input value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="e.g. Raffles Hotel Pte Ltd" style={inputStyle} />
        </div>

        <div style={{ marginBottom: 8 }}>
          <label style={labelStyle}>UEN (Unique Entity Number) <span style={{ color: "#ef4444" }}>*</span></label>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              value={uen}
              onChange={(e) => { setUen(e.target.value); setUenStatus("idle"); setUenError(""); }}
              placeholder="e.g. 201234567K"
              style={{ ...inputStyle, flex: 1 }}
            />
            <button
              type="button"
              onClick={checkUEN}
              disabled={!uen.trim() || !companyName.trim() || uenStatus === "checking"}
              className="btn-primary"
              style={{ padding: "9px 16px", fontSize: 13, whiteSpace: "nowrap" }}
            >
              {uenStatus === "checking" ? "Checking…" : "Check UEN →"}
            </button>
          </div>
          <p style={{ fontSize: 11, color: "var(--text-faint)", marginTop: 4 }}>UEN format: e.g. 201234567K</p>
          {uenError && <p style={{ fontSize: 12, color: "#ef4444", marginTop: 4 }}>{uenError}</p>}
        </div>

        {uenStatus === "clear" && (
          <div style={{ background: "#22c55e11", border: "1px solid #22c55e44", borderRadius: 6, padding: "10px 14px", color: "#22c55e", fontSize: 13 }}>
            ✓ {uenMessage}
          </div>
        )}

        {uenStatus === "conflict" && (
          <div style={{ background: "#f59e0b11", border: "1px solid #f59e0b44", borderRadius: 8, padding: "16px 20px" }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: "#f59e0b", marginBottom: 6 }}>⚠ This company is already registered on the LyPX platform.</p>
            <p style={{ fontSize: 13, color: "var(--text-dim)", marginBottom: 16, lineHeight: 1.5 }}>
              Your request has been submitted for review. LyPX will contact you within 2 business days.
            </p>
            <label style={labelStyle}>Add a note for LyPX (optional)</label>
            <textarea
              value={challengerNote}
              onChange={(e) => setChallengerNote(e.target.value)}
              rows={3}
              placeholder="Provide any context that may help LyPX review your request…"
              style={{ ...inputStyle, resize: "vertical" }}
            />
            {error && <p style={{ fontSize: 12, color: "#ef4444", marginTop: 8 }}>{error}</p>}
            <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
              <button type="button" onClick={() => router.back()} style={{ flex: 1, padding: "9px", background: "none", border: "1px solid var(--border)", borderRadius: 6, color: "var(--text-dim)", fontSize: 13, cursor: "pointer" }}>Cancel</button>
              <button type="button" onClick={submitConflict} disabled={submitting} className="btn-primary" style={{ flex: 2, padding: "9px", fontSize: 13 }}>
                {submitting ? "Submitting…" : "Submit Request"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Step 2 — Account Details (only shown when clear) */}
      {uenStatus === "clear" && (
        <form onSubmit={handleSubmit}>
          <div style={{ borderTop: "1px solid var(--border)", paddingTop: 24, marginBottom: 20 }}>
            <p style={{ fontSize: 11, color: "var(--text-faint)", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 20 }}>Step 2 — Account Details</p>

            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Customer Segment <span style={{ color: "#ef4444" }}>*</span></label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {SEGMENTS.map((s) => (
                  <button key={s.value} type="button" onClick={() => setSegment(s.value)}
                    style={{ padding: "7px 14px", fontSize: 12, borderRadius: 6, cursor: "pointer", fontWeight: segment === s.value ? 600 : 400, background: segment === s.value ? "var(--gold)" : "var(--surface-raised)", color: segment === s.value ? "#000" : "var(--text-dim)", border: `1px solid ${segment === s.value ? "var(--gold)" : "var(--border)"}` }}>
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Primary Contact Name</label>
              <input value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder="e.g. John Tan" style={inputStyle} />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Primary Contact Email</label>
              <input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} placeholder="john@raffles.com" style={inputStyle} />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Contact Phone</label>
              <input type="tel" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} placeholder="+65 9123 4567" style={inputStyle} />
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={labelStyle}>Internal Notes</label>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} style={{ ...inputStyle, resize: "vertical" }} />
            </div>
          </div>

          {error && <div style={{ background: "#ef444422", border: "1px solid #ef4444", borderRadius: 6, padding: "10px 14px", color: "#ef4444", fontSize: 13, marginBottom: 16 }}>{error}</div>}

          <div style={{ display: "flex", gap: 10 }}>
            <button type="button" onClick={() => router.back()} style={{ flex: 1, padding: "10px", background: "none", border: "1px solid var(--border)", borderRadius: 6, color: "var(--text-dim)", fontSize: 13, cursor: "pointer" }}>Cancel</button>
            <button type="submit" disabled={submitting || !segment} className="btn-primary" style={{ flex: 2, padding: "10px", fontSize: 13 }}>
              {submitting ? "Creating…" : "Onboard Account"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
