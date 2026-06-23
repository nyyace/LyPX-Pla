"use client";

import { useState } from "react";

export function AddAdminDrawer({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim(), name: name.trim() || undefined }),
    });

    setLoading(false);

    if (!res.ok) {
      const d = await res.json();
      setError(d.error ?? "Failed to send invitation");
      return;
    }

    onSuccess();
  }

  const labelStyle: React.CSSProperties = { fontSize: 12, color: "var(--text-dim)", fontWeight: 500, marginBottom: 6, display: "block" };
  const inputStyle: React.CSSProperties = { width: "100%", background: "var(--surface-raised)", border: "1px solid var(--border)", borderRadius: 6, padding: "9px 12px", fontSize: 13, color: "var(--text)", outline: "none", boxSizing: "border-box" };

  return (
    <>
      <div
        onClick={onClose}
        style={{ position: "fixed", inset: 0, background: "#00000066", zIndex: 40 }}
      />

      <div style={{
        position: "fixed", top: 0, right: 0, bottom: 0, width: 400,
        background: "var(--surface)", borderLeft: "1px solid var(--border)",
        zIndex: 50, display: "flex", flexDirection: "column",
      }}>
        <div style={{ padding: "24px 28px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: "var(--text)" }}>Invite Admin User</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--text-dim)", fontSize: 20, cursor: "pointer", lineHeight: 1 }}>×</button>
        </div>

        <form onSubmit={handleSubmit} style={{ flex: 1, overflowY: "auto", padding: "24px 28px", display: "flex", flexDirection: "column", gap: 18 }}>
          <p style={{ fontSize: 13, color: "var(--text-dim)", margin: 0 }}>
            The invited user will receive an email to join the LyPX Admin Console.
          </p>

          <div>
            <label style={labelStyle}>Email Address <span style={{ color: "#ef4444" }}>*</span></label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. admin@lypx.sg"
              required
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>Name (optional)</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Sarah Lim"
              style={inputStyle}
            />
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
              {loading ? "Sending…" : "Send Invite"}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
