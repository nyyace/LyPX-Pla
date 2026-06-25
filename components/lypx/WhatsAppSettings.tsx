"use client";

import { useState } from "react";

export function WhatsAppSettings() {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <section>
        <p style={{ fontSize: 11, color: "var(--text-faint)", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: 20 }}>
          WhatsApp for Business
        </p>

        {/* Connect CTA */}
        <div style={{ marginBottom: 28 }}>
          <p style={{ fontSize: 14, fontWeight: 600, color: "var(--text)", margin: "0 0 6px" }}>
            Your Branded WhatsApp
          </p>
          <p style={{ fontSize: 13, color: "var(--text-dim)", lineHeight: 1.6, margin: "0 0 20px" }}>
            Connect your own WhatsApp Business number so your customers receive
            trip updates from your brand — not from a shared LyPX number.
          </p>

          <div style={{
            border: "1px solid var(--border)", borderRadius: 8,
            padding: "28px", textAlign: "center",
          }}>
            <button
              onClick={() => setModalOpen(true)}
              className="btn-primary"
              style={{ fontSize: 13, padding: "10px 22px", fontWeight: 600 }}
            >
              Connect WhatsApp Business Account →
            </button>
            <p style={{ fontSize: 11, color: "var(--text-faint)", marginTop: 12 }}>
              Requires a verified Meta Business Account
            </p>
          </div>
        </div>

        {/* Current state */}
        <div style={{ borderTop: "1px solid var(--border)", paddingTop: 24 }}>
          <p style={{ fontSize: 11, color: "var(--text-faint)", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 16 }}>
            Currently Active
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", gap: 16 }}>
              <span style={{ fontSize: 12, color: "var(--text-faint)", width: 80 }}>Sender</span>
              <span style={{ fontSize: 13, color: "var(--text)" }}>LyPX shared number</span>
            </div>
            <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
              <span style={{ fontSize: 12, color: "var(--text-faint)", width: 80 }}>Status</span>
              <span style={{ fontSize: 13, color: "#4CAF6D", fontWeight: 500 }}>● Active</span>
            </div>
            <div style={{ display: "flex", gap: 16 }}>
              <span style={{ fontSize: 12, color: "var(--text-faint)", width: 80 }}>Updates</span>
              <span style={{ fontSize: 13, color: "var(--text-dim)", lineHeight: 1.5, maxWidth: 320 }}>
                All trip status messages sent from LyPX&apos;s verified WhatsApp Business number.
                Templates approved and managed by LyPX.
              </span>
            </div>
          </div>
        </div>
        <div style={{ marginTop: 24, paddingTop: 20, borderTop: "1px solid var(--border)" }}>
          <button
            disabled
            title="No WhatsApp settings to configure yet"
            style={{
              background: "var(--surface-raised)", border: "none", borderRadius: 4,
              color: "var(--text-faint)", fontSize: 12, fontWeight: 700,
              padding: "9px 20px", cursor: "not-allowed",
            }}
          >
            Save WhatsApp Settings
          </button>
        </div>
      </section>

      {/* Coming Soon modal */}
      {modalOpen && (
        <>
          <div onClick={() => setModalOpen(false)} style={{ position: "fixed", inset: 0, background: "#00000066", zIndex: 60 }} />
          <div style={{
            position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)",
            background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10,
            padding: "36px 40px", width: 460, zIndex: 70,
          }}>
            <p style={{ fontSize: 18, fontWeight: 700, color: "var(--accent)", margin: "0 0 20px" }}>
              ✦ Coming Soon
            </p>
            <p style={{ fontSize: 14, color: "var(--text)", lineHeight: 1.7, margin: "0 0 12px" }}>
              We are completing our Meta Tech Provider application to enable this feature.
            </p>
            <p style={{ fontSize: 13, color: "var(--text-dim)", lineHeight: 1.7, margin: "0 0 28px" }}>
              Once approved, you will be able to connect your own WhatsApp Business
              number directly from this screen — no technical setup needed.
              <br /><br />
              We will notify you as soon as it is available.
            </p>
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button
                onClick={() => setModalOpen(false)}
                className="btn-primary"
                style={{ fontSize: 13, padding: "9px 24px" }}
              >
                Got it
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
