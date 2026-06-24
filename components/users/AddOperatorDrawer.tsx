"use client";

import { useState } from "react";

const TIMEZONES = [
  "Asia/Singapore",
  "Asia/Kuala_Lumpur",
  "Asia/Jakarta",
  "Asia/Bangkok",
  "Asia/Manila",
  "Asia/Tokyo",
  "Asia/Seoul",
  "UTC",
];

export function AddOperatorDrawer({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [companyName, setCompanyName] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [marketplace, setMarketplace] = useState(false);
  const [timezone, setTimezone] = useState("Asia/Singapore");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await fetch("/api/admin/operators", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        companyName: companyName.trim(),
        contactName: contactName.trim(),
        contactEmail: contactEmail.trim(),
        contactPhone: contactPhone.trim() || undefined,
        marketplaceParticipation: marketplace,
        timezone,
      }),
    });

    setLoading(false);

    if (!res.ok) {
      const d = await res.json();
      setError(d.error ?? "Failed to invite operator");
      return;
    }

    const data = await res.json();
    if (data.acceptInvitationUrl) {
      setInviteLink(data.acceptInvitationUrl);
      onSuccess();
    } else {
      onSuccess();
    }
  }

  async function copyLink() {
    if (!inviteLink) return;
    await navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const labelStyle: React.CSSProperties = { fontSize: 12, color: "var(--text-dim)", fontWeight: 500, marginBottom: 6, display: "block" };
  const inputStyle: React.CSSProperties = { width: "100%", background: "var(--surface-raised)", border: "1px solid var(--border)", borderRadius: 6, padding: "9px 12px", fontSize: 13, color: "var(--text)", outline: "none", boxSizing: "border-box" };

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={inviteLink ? undefined : onClose}
        style={{ position: "fixed", inset: 0, background: "#00000066", zIndex: 40 }}
      />

      {/* Drawer */}
      <div style={{
        position: "fixed", top: 0, right: 0, bottom: 0, width: 420,
        background: "var(--surface)", borderLeft: "1px solid var(--border)",
        zIndex: 50, display: "flex", flexDirection: "column",
      }}>
        <div style={{ padding: "24px 28px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: "var(--text)" }}>
            {inviteLink ? "Invite Sent" : "Invite Operator"}
          </h2>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--text-dim)", fontSize: 20, cursor: "pointer", lineHeight: 1 }}>×</button>
        </div>

        {/* Invite link success state */}
        {inviteLink ? (
          <div style={{ flex: 1, padding: "28px", display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{ background: "#22c55e11", border: "1px solid #22c55e44", borderRadius: 8, padding: "14px 16px" }}>
              <p style={{ margin: "0 0 4px", fontSize: 13, fontWeight: 600, color: "#22c55e" }}>Operator invited successfully</p>
              <p style={{ margin: 0, fontSize: 12, color: "var(--text-dim)" }}>
                {contactEmail} has been invited to join {companyName}.
              </p>
            </div>

            <div>
              <p style={{ fontSize: 12, color: "var(--text-dim)", marginBottom: 8, fontWeight: 500 }}>
                Invitation link — share this if the email wasn't received:
              </p>
              <div style={{ background: "var(--surface-raised)", border: "1px solid var(--border)", borderRadius: 6, padding: "10px 12px", fontSize: 11, color: "var(--text-dim)", fontFamily: "monospace", wordBreak: "break-all", lineHeight: 1.5 }}>
                {inviteLink}
              </div>
              <button
                onClick={copyLink}
                style={{ marginTop: 10, width: "100%", padding: "9px", background: copied ? "#22c55e22" : "var(--surface-raised)", border: `1px solid ${copied ? "#22c55e" : "var(--border)"}`, borderRadius: 6, color: copied ? "#22c55e" : "var(--text)", fontSize: 13, cursor: "pointer", transition: "all 0.15s" }}
              >
                {copied ? "Copied!" : "Copy Link"}
              </button>
            </div>

            <p style={{ fontSize: 11, color: "var(--text-faint)", margin: 0 }}>
              This link expires in 7 days. Use Resend or Revoke from the operators table if needed.
            </p>

            <button
              onClick={onClose}
              className="btn-primary"
              style={{ padding: "10px", fontSize: 13 }}
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ flex: 1, overflowY: "auto", padding: "24px 28px", display: "flex", flexDirection: "column", gap: 18 }}>
            <div>
              <label style={labelStyle}>Company Name <span style={{ color: "#ef4444" }}>*</span></label>
              <input
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="e.g. AceFleet Pte Ltd"
                required
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>Contact Name <span style={{ color: "#ef4444" }}>*</span></label>
              <input
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                placeholder="e.g. John Tan"
                required
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>Contact Email <span style={{ color: "#ef4444" }}>*</span></label>
              <input
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="e.g. john@acefleet.sg"
                required
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>Contact Phone</label>
              <input
                type="tel"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder="+65 9123 4567"
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>Timezone</label>
              <select
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                style={{ ...inputStyle, cursor: "pointer" }}
              >
                {TIMEZONES.map((tz) => (
                  <option key={tz} value={tz}>{tz}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={marketplace}
                  onChange={(e) => setMarketplace(e.target.checked)}
                  style={{ width: 16, height: 16 }}
                />
                <span style={{ fontSize: 13, color: "var(--text)" }}>Marketplace participation</span>
              </label>
              <p style={{ fontSize: 11, color: "var(--text-faint)", marginTop: 4, marginLeft: 26 }}>
                Operator's vehicles will appear in the LyPX marketplace
              </p>
            </div>

            {error && (
              <div style={{ background: "#ef444422", border: "1px solid #ef4444", borderRadius: 6, padding: "10px 14px", color: "#ef4444", fontSize: 13 }}>
                {error}
              </div>
            )}

            <div style={{ display: "flex", gap: 10, paddingTop: 8 }}>
              <button
                type="button"
                onClick={onClose}
                style={{ flex: 1, padding: "10px", background: "none", border: "1px solid var(--border)", borderRadius: 6, color: "var(--text-dim)", fontSize: 13, cursor: "pointer" }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="btn-primary"
                style={{ flex: 2, padding: "10px", fontSize: 13 }}
              >
                {loading ? "Sending invite…" : "Send Invite"}
              </button>
            </div>
          </form>
        )}
      </div>
    </>
  );
}
