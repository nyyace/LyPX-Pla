"use client";

import { useState, useEffect, useRef } from "react";

type Message = {
  id: string;
  direction: "inbound" | "outbound";
  from: string;
  to: string;
  body: string | null;
  templateName: string | null;
  isRead: boolean;
  createdAt: string;
};

type Conversation = {
  phone: string;
  lastAt: string;
  unreadCount: number;
  messages: Message[];
};

interface Props {
  onClose: () => void;
  onUnreadChange: (count: number) => void;
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-SG", { hour: "2-digit", minute: "2-digit", hour12: false });
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-SG", { day: "2-digit", month: "short" });
}

export function WhatsAppInboxPanel({ onClose, onUnreadChange }: Props) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const threadRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/operator/whatsapp/inbox")
      .then(r => r.json())
      .then(d => {
        setConversations(d.conversations ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  async function handleSelect(phone: string) {
    setSelected(phone);
    // Mark all as read
    await fetch("/api/operator/whatsapp/read-all", { method: "POST" });
    setConversations(prev =>
      prev.map(c => ({
        ...c,
        unreadCount: 0,
        messages: c.messages.map(m => ({ ...m, isRead: true })),
      }))
    );
    onUnreadChange(0);
    setTimeout(() => {
      threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight, behavior: "smooth" });
    }, 50);
  }

  const selectedConv = conversations.find(c => c.phone === selected);

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{ position: "fixed", inset: 0, zIndex: 99 }}
      />

      {/* Panel */}
      <div style={{
        position: "fixed", top: 52, right: 16, bottom: 16, width: 520,
        background: "var(--surface)", border: "1px solid var(--border)",
        borderRadius: 8, zIndex: 100, display: "flex", flexDirection: "column",
        boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
      }}>
        {/* Header */}
        <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {selected && (
              <button onClick={() => setSelected(null)} style={{ background: "none", border: "none", color: "var(--text-faint)", cursor: "pointer", fontSize: 16, padding: "0 4px" }}>‹</button>
            )}
            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>
              {selected ? selected : "WhatsApp Inbox"}
            </span>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--text-faint)", cursor: "pointer", fontSize: 18, lineHeight: 1 }}>×</button>
        </div>

        {/* Body */}
        {!selected ? (
          // Conversation list
          <div style={{ flex: 1, overflowY: "auto" }}>
            {loading ? (
              <div style={{ textAlign: "center", padding: "48px 0", color: "var(--text-faint)", fontSize: 13 }}>Loading…</div>
            ) : conversations.length === 0 ? (
              <div style={{ textAlign: "center", padding: "48px 0", color: "var(--text-faint)", fontSize: 13 }}>No messages yet</div>
            ) : conversations.map(c => {
              const lastMsg = c.messages[0];
              return (
                <button
                  key={c.phone}
                  onClick={() => handleSelect(c.phone)}
                  style={{
                    width: "100%", textAlign: "left", background: "none",
                    border: "none", borderBottom: "1px solid var(--border)",
                    padding: "12px 18px", cursor: "pointer", display: "flex",
                    alignItems: "center", gap: 12,
                  }}
                >
                  <div style={{
                    width: 36, height: 36, borderRadius: "50%", background: "var(--surface-raised)",
                    border: "1px solid var(--border)", display: "flex", alignItems: "center",
                    justifyContent: "center", fontSize: 14, color: "var(--text-dim)", flexShrink: 0,
                  }}>
                    💬
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
                      <span style={{ fontSize: 13, fontWeight: c.unreadCount > 0 ? 700 : 500, color: "var(--text)" }}>
                        {c.phone}
                      </span>
                      <span style={{ fontSize: 11, color: "var(--text-faint)", flexShrink: 0 }}>
                        {fmtDate(c.lastAt)}
                      </span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginTop: 2 }}>
                      <span style={{
                        fontSize: 12, color: "var(--text-faint)", overflow: "hidden",
                        textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1,
                      }}>
                        {lastMsg?.direction === "outbound" ? "You: " : ""}
                        {lastMsg?.body ?? (lastMsg?.templateName ? `[template: ${lastMsg.templateName}]` : "…")}
                      </span>
                      {c.unreadCount > 0 && (
                        <span style={{
                          minWidth: 18, height: 18, borderRadius: 9, background: "#25D366",
                          color: "#fff", fontSize: 10, fontWeight: 700, display: "flex",
                          alignItems: "center", justifyContent: "center", padding: "0 5px", flexShrink: 0,
                        }}>
                          {c.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          // Thread view
          <div ref={threadRef} style={{ flex: 1, overflowY: "auto", padding: "12px 18px", display: "flex", flexDirection: "column", gap: 8 }}>
            {selectedConv?.messages.slice().reverse().map(m => {
              const isOut = m.direction === "outbound";
              return (
                <div key={m.id} style={{ display: "flex", justifyContent: isOut ? "flex-end" : "flex-start" }}>
                  <div style={{
                    maxWidth: "75%", background: isOut ? "var(--accent-dim)" : "var(--surface-raised)",
                    border: `1px solid ${isOut ? "var(--accent)" : "var(--border)"}`,
                    borderRadius: 8, padding: "8px 12px",
                  }}>
                    {m.body ? (
                      <p style={{ fontSize: 13, color: "var(--text)", margin: 0, lineHeight: 1.5 }}>{m.body}</p>
                    ) : m.templateName ? (
                      <p style={{ fontSize: 12, color: "var(--text-faint)", margin: 0, fontStyle: "italic" }}>
                        Template: {m.templateName}
                      </p>
                    ) : null}
                    <p style={{ fontSize: 10, color: "var(--text-faint)", margin: "4px 0 0", textAlign: isOut ? "right" : "left" }}>
                      {fmtTime(m.createdAt)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Footer note — read-only inbox */}
        <div style={{ padding: "10px 18px", borderTop: "1px solid var(--border)" }}>
          <p style={{ fontSize: 11, color: "var(--text-faint)", margin: 0 }}>
            Read-only inbox. Outbound messages are sent automatically by the platform.
          </p>
        </div>
      </div>
    </>
  );
}
