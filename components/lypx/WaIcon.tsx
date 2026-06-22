"use client";
import { useState } from "react";

interface Props {
  driverId?: string;
  phone?: string;
}

export function WaIcon({ driverId, phone }: Props) {
  const [open, setOpen] = useState(false);
  const [msg, setMsg] = useState("");
  const [sending, setSending] = useState(false);

  if (!driverId) return null;

  async function send() {
    setSending(true);
    await fetch("/api/whatsapp/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ driverId, message: msg }),
    });
    setSending(false);
    setOpen(false);
    setMsg("");
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        title="Send WhatsApp"
        style={{
          background: "none", border: "none", cursor: "pointer",
          color: "var(--text-faint)", padding: "4px 6px", borderRadius: 4,
          fontSize: 14, lineHeight: 1,
        }}
        onMouseOver={e => (e.currentTarget.style.color = "#25D366")}
        onMouseOut={e => (e.currentTarget.style.color = "var(--text-faint)")}
      >
        ✉
      </button>

      {open && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex",
          alignItems: "center", justifyContent: "center", zIndex: 1000,
        }} onClick={() => setOpen(false)}>
          <div style={{
            background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8,
            padding: 24, width: 360,
          }} onClick={e => e.stopPropagation()}>
            <p className="panel-title" style={{ marginBottom: 12 }}>Send WhatsApp</p>
            <textarea
              value={msg}
              onChange={e => setMsg(e.target.value)}
              placeholder="Type a message..."
              rows={3}
              style={{
                width: "100%", background: "var(--surface-raised)", border: "1px solid var(--border)",
                borderRadius: 4, color: "var(--text)", fontSize: 13, padding: "8px 10px",
                resize: "vertical", marginBottom: 12,
              }}
            />
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button onClick={() => setOpen(false)} style={{
                background: "none", border: "1px solid var(--border)", borderRadius: 4,
                color: "var(--text-dim)", fontSize: 12, padding: "7px 14px", cursor: "pointer",
              }}>Cancel</button>
              <button onClick={send} disabled={!msg.trim() || sending} style={{
                background: "var(--accent)", border: "none", borderRadius: 4,
                color: "#1A1305", fontSize: 12, fontWeight: 700, padding: "7px 14px", cursor: "pointer",
              }}>
                {sending ? "Sending…" : "Send"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
