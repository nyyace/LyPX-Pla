"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type Conflict = {
  id: string;
  accountName: string;
  uen: string;
  holderName: string;
  challengerName: string;
  challengerNote: string | null;
  createdAt: string;
  existingClaimId: string;
  accountId: string;
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-SG", { day: "2-digit", month: "short", year: "numeric" });
}

export function ClaimConflictsPanel({ conflicts }: { conflicts: Conflict[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selected, setSelected] = useState<Conflict | null>(null);
  const [decision, setDecision] = useState<"allowed" | "rejected" | "flagged" | "">("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDecision() {
    if (!selected || !decision || !notes.trim()) return;
    setSubmitting(true);
    setError(null);
    const res = await fetch(`/api/admin/claim-conflicts/${selected.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ decision, notes }),
    });
    setSubmitting(false);
    if (!res.ok) {
      const d = await res.json();
      setError(d.error ?? "Failed to submit decision");
      return;
    }
    setSelected(null);
    setDecision("");
    setNotes("");
    startTransition(() => router.refresh());
  }

  const colStyle: React.CSSProperties = { padding: "10px 12px", fontSize: 13, color: "var(--text)" };
  const thStyle: React.CSSProperties = { ...colStyle, color: "var(--text-faint)", fontWeight: 500, fontSize: 11, textTransform: "uppercase" as const, letterSpacing: "0.5px", borderBottom: "1px solid var(--border)" };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <div>
          <h2 style={{ fontSize: 15, fontWeight: 600, color: "var(--text)", margin: 0 }}>Claim Conflicts</h2>
          <p style={{ fontSize: 12, color: "var(--text-dim)", margin: "3px 0 0" }}>UEN disputes requiring admin decision</p>
        </div>
        {conflicts.length > 0 && (
          <span style={{ fontSize: 12, fontWeight: 600, color: "#f59e0b", background: "#f59e0b11", border: "1px solid #f59e0b44", padding: "3px 10px", borderRadius: 12 }}>
            {conflicts.length} pending
          </span>
        )}
      </div>

      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={{ ...thStyle, textAlign: "left" }}>Company</th>
              <th style={{ ...thStyle, textAlign: "left" }}>UEN</th>
              <th style={{ ...thStyle, textAlign: "left" }}>Holder</th>
              <th style={{ ...thStyle, textAlign: "left" }}>Challenger</th>
              <th style={{ ...thStyle, textAlign: "left" }}>Filed</th>
              <th style={{ ...thStyle }} />
            </tr>
          </thead>
          <tbody>
            {conflicts.length === 0 && (
              <tr>
                <td colSpan={6} style={{ ...colStyle, textAlign: "center", color: "var(--text-faint)", padding: "28px 12px" }}>
                  No pending conflicts
                </td>
              </tr>
            )}
            {conflicts.map((c, i) => (
              <tr key={c.id} style={{ borderTop: i === 0 ? undefined : "1px solid var(--border)" }}>
                <td style={colStyle}><span style={{ fontWeight: 600 }}>{c.accountName}</span></td>
                <td style={{ ...colStyle, fontFamily: "monospace", fontSize: 12, color: "var(--text-dim)" }}>{c.uen}</td>
                <td style={{ ...colStyle, color: "var(--text-dim)" }}>{c.holderName}</td>
                <td style={{ ...colStyle, color: "var(--text-dim)" }}>{c.challengerName}</td>
                <td style={{ ...colStyle, color: "var(--text-faint)", fontSize: 12 }}>{fmtDate(c.createdAt)}</td>
                <td style={{ ...colStyle, textAlign: "right" }}>
                  <button
                    onClick={() => { setSelected(c); setDecision(""); setNotes(""); setError(null); }}
                    style={{ fontSize: 12, color: "var(--text-dim)", background: "none", border: "1px solid var(--border)", borderRadius: 4, padding: "4px 10px", cursor: "pointer" }}
                  >
                    Review
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Detail panel */}
      {selected && (
        <>
          <div onClick={() => setSelected(null)} style={{ position: "fixed", inset: 0, background: "#00000066", zIndex: 40 }} />
          <div style={{ position: "fixed", top: 0, right: 0, bottom: 0, width: 480, background: "var(--surface)", borderLeft: "1px solid var(--border)", zIndex: 50, display: "flex", flexDirection: "column", overflowY: "auto" }}>
            <div style={{ padding: "24px 28px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: "var(--text)" }}>Claim Conflict — {selected.accountName}</h2>
                <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--text-dim)" }}>UEN: {selected.uen} · Filed: {fmtDate(selected.createdAt)}</p>
              </div>
              <button onClick={() => setSelected(null)} style={{ background: "none", border: "none", color: "var(--text-dim)", fontSize: 20, cursor: "pointer" }}>×</button>
            </div>

            <div style={{ padding: "24px 28px", display: "flex", flexDirection: "column", gap: 20 }}>
              <div style={{ background: "var(--surface-raised)", border: "1px solid var(--border)", borderRadius: 8, padding: "14px 16px" }}>
                <p style={{ fontSize: 11, color: "var(--text-faint)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 8 }}>Existing Holder</p>
                <p style={{ fontSize: 14, fontWeight: 600, color: "var(--text)", margin: 0 }}>{selected.holderName}</p>
              </div>

              <div style={{ background: "var(--surface-raised)", border: "1px solid var(--border)", borderRadius: 8, padding: "14px 16px" }}>
                <p style={{ fontSize: 11, color: "var(--text-faint)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 8 }}>Challenger</p>
                <p style={{ fontSize: 14, fontWeight: 600, color: "var(--text)", margin: "0 0 4px" }}>{selected.challengerName}</p>
                <p style={{ fontSize: 12, color: "var(--text-dim)", margin: 0 }}>Submitted: {fmtDate(selected.createdAt)}</p>
                {selected.challengerNote && (
                  <p style={{ fontSize: 12, color: "var(--text)", marginTop: 8, fontStyle: "italic" }}>{selected.challengerNote}</p>
                )}
              </div>

              <div>
                <p style={{ fontSize: 12, fontWeight: 600, color: "var(--text)", marginBottom: 12 }}>Decision</p>
                {(["allowed", "rejected", "flagged"] as const).map((d) => (
                  <label key={d} style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 12, cursor: "pointer" }}>
                    <input type="radio" name="decision" value={d} checked={decision === d} onChange={() => setDecision(d)} style={{ marginTop: 2 }} />
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 500, color: "var(--text)", margin: 0, textTransform: "capitalize" }}>{d === "allowed" ? "Allow" : d === "rejected" ? "Reject" : "Flag"}</p>
                      <p style={{ fontSize: 11, color: "var(--text-faint)", margin: "3px 0 0" }}>
                        {d === "allowed" && "Create a new 90-day claim for the challenger."}
                        {d === "rejected" && "Decline the request. No change to existing claim."}
                        {d === "flagged" && "Contact both parties for more information."}
                      </p>
                    </div>
                  </label>
                ))}
              </div>

              <div>
                <label style={{ fontSize: 12, color: "var(--text-dim)", fontWeight: 500, marginBottom: 6, display: "block" }}>
                  Decision notes <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  placeholder="Required — your reasoning or instructions for both parties"
                  style={{ width: "100%", background: "var(--surface-raised)", border: "1px solid var(--border)", borderRadius: 6, padding: "9px 12px", fontSize: 13, color: "var(--text)", outline: "none", resize: "vertical", boxSizing: "border-box" }}
                />
              </div>

              {error && <p style={{ fontSize: 13, color: "#ef4444" }}>{error}</p>}

              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={() => setSelected(null)} style={{ flex: 1, padding: "10px", background: "none", border: "1px solid var(--border)", borderRadius: 6, color: "var(--text-dim)", fontSize: 13, cursor: "pointer" }}>Cancel</button>
                <button
                  onClick={handleDecision}
                  disabled={!decision || !notes.trim() || submitting || isPending}
                  className="btn-primary"
                  style={{ flex: 2, padding: "10px", fontSize: 13 }}
                >
                  {submitting ? "Submitting…" : "Submit Decision"}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
