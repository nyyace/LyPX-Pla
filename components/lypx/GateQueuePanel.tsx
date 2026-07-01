"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { formatTZDate, isExpired, isWithinDays, DEFAULT_TIMEZONE } from "@/lib/utils/date";

type Doc = {
  id: string;
  docType: string;
  status: string;
  expiryDate: Date | null;
  driver?: { id: string; firstName: string; lastName: string; complianceStatus: string } | null;
  vehicle?: { id: string; plateNumber: string; make: string; model: string } | null;
  file?: { fileName: string; mimeType: string } | null;
};

interface Props {
  driverDocs: Doc[];
  vehicleDocs: Doc[];
  entity: string;
  statusFilter: string;
  suspended: number;
  expiringSoon: number;
  pendingReview: number;
  timezone?: string;
  isAdmin?: boolean;
  onApprove?: (docId: string) => void;
  onReject?: (docId: string, reason: string) => void;
}

const DOC_TYPE_LABELS: Record<string, string> = {
  nric: "NRIC / Passport",
  license: "Driver Licence",
  driving_licence: "Driving Licence",
  vocational_licence: "Vocational Licence",
  vocational_licence_expiry: "Vocational Licence (Expiry Page)",
  insurance: "Insurance",
  registration: "Vehicle Log Card",
  vehicle_log_card: "Vehicle Log Card",
  inspection: "Inspection Certificate",
  background_check: "Background Check",
  rental_agreement: "Rental Agreement",
};

function StatusChip({ doc }: { doc: Doc }) {
  const driver = doc.driver;
  if (driver?.complianceStatus === "suspended") return <span className="chip chip-red">SUSPENDED</span>;
  if (doc.status === "pending_review") return <span className="chip chip-blue">PENDING REVIEW</span>;
  if (isExpired(doc.expiryDate)) return <span className="chip chip-red">EXPIRED</span>;
  if (isWithinDays(doc.expiryDate, 30)) return <span className="chip chip-amber">EXPIRING SOON</span>;
  return <span className="chip chip-green">VALID</span>;
}

function UploadDocCard({
  doc,
  timezone,
  isAdmin,
  onApprove,
  onReject,
}: {
  doc: Doc;
  timezone: string;
  isAdmin: boolean;
  onApprove?: (id: string) => void;
  onReject?: (id: string, reason: string) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const entityLabel = doc.driver
    ? `${doc.driver.firstName} ${doc.driver.lastName}`
    : doc.vehicle?.plateNumber ?? "Unknown";
  const entityId = doc.driver?.id ?? doc.vehicle?.id ?? "";
  const entityHref = doc.driver
    ? `/drivers/${doc.driver.id}`
    : doc.vehicle ? `/vehicles/${doc.vehicle.id}` : "#";

  const daysText = (() => {
    if (!doc.expiryDate) return "No expiry date";
    const days = Math.ceil((new Date(doc.expiryDate).getTime() - Date.now()) / 86400000);
    if (days < 0) return `EXPIRED ${-days} day${-days !== 1 ? "s" : ""} ago`;
    if (days === 0) return "Expires today";
    return `Expires in ${days} day${days !== 1 ? "s" : ""}`;
  })();

  async function uploadFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const form = new FormData();
    form.append("file", file);
    form.append("docId", doc.id);
    await fetch(`/api/compliance/${doc.id}/upload`, { method: "POST", body: form });
    setUploading(false);
    setUploaded(true);
    router.refresh();
  }

  return (
    <div className="booking-card" style={{ marginBottom: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
        <div>
          <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text)" }}>{entityLabel}</span>
          {doc.vehicle && doc.driver && (
            <span style={{ fontSize: 11, color: "var(--text-faint)", marginLeft: 8 }}>
              Owned by {doc.driver.firstName} {doc.driver.lastName}
            </span>
          )}
        </div>
        <StatusChip doc={doc} />
      </div>

      <div style={{ marginBottom: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid var(--border)" }}>
          <span style={{ fontSize: 13, color: "var(--text-dim)" }}>
            {DOC_TYPE_LABELS[doc.docType] ?? doc.docType}
          </span>
          <span style={{ fontSize: 12, color: isExpired(doc.expiryDate) ? "var(--red)" : isWithinDays(doc.expiryDate, 7) ? "var(--accent)" : "var(--text-faint)" }}>
            {daysText}
          </span>
        </div>
        {doc.file && (
          <a href={`/api/compliance/${doc.id}/file`} target="_blank" rel="noopener noreferrer"
            style={{ fontSize: 11, color: "#7FC8F8", display: "block", marginTop: 6 }}>
            View {doc.file.mimeType === "application/pdf" ? "PDF" : "image"} ↗
          </a>
        )}
        {doc.status === "pending_review" && !isAdmin && (
          <p style={{ fontSize: 11, color: "var(--text-faint)", marginTop: 8, fontStyle: "italic" }}>
            Document submitted. LyPX compliance team will verify within 24 hours.
          </p>
        )}
      </div>

      <div style={{ display: "flex", gap: 8, justifyContent: "space-between", alignItems: "center" }}>
        {/* Operator: upload only */}
        {!isAdmin && (
          <>
            <input ref={fileRef} type="file" accept="image/*,application/pdf" onChange={uploadFile} style={{ display: "none" }} />
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading || uploaded}
              style={{
                background: "none", border: "1px solid var(--border)", borderRadius: 4,
                color: uploaded ? "var(--green)" : "var(--text-dim)", fontSize: 12,
                padding: "7px 14px", cursor: "pointer",
              }}>
              {uploading ? "Uploading…" : uploaded ? "✓ Submitted" : "Upload Document"}
            </button>
            <Link href={entityHref} style={{
              fontSize: 12, color: "var(--text-faint)", textDecoration: "none",
              border: "1px solid var(--border)", borderRadius: 4, padding: "7px 14px",
            }}>View Full Profile</Link>
          </>
        )}

        {/* Admin: approve / reject */}
        {isAdmin && (
          <>
            {rejecting ? (
              <div style={{ flex: 1 }}>
                <input value={reason} onChange={e => setReason(e.target.value)}
                  placeholder="Reason for rejection (required)…"
                  style={{
                    width: "100%", background: "var(--surface-raised)", border: "1px solid var(--border)",
                    borderRadius: 4, color: "var(--text)", fontSize: 12, padding: "7px 10px", marginBottom: 6,
                  }} />
                <div style={{ display: "flex", gap: 6 }}>
                  <button onClick={() => setRejecting(false)} style={{
                    background: "none", border: "1px solid var(--border)", borderRadius: 4,
                    color: "var(--text-dim)", fontSize: 11, padding: "5px 10px", cursor: "pointer",
                  }}>Cancel</button>
                  <button onClick={() => reason && onReject?.(doc.id, reason)} disabled={!reason} style={{
                    background: "rgba(217,83,79,0.2)", border: "1px solid rgba(217,83,79,0.4)", borderRadius: 4,
                    color: "#D9534F", fontSize: 11, fontWeight: 700, padding: "5px 10px", cursor: reason ? "pointer" : "not-allowed",
                  }}>Confirm Reject</button>
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => onApprove?.(doc.id)} style={{
                  background: "rgba(76,175,109,0.15)", border: "1px solid rgba(76,175,109,0.35)", borderRadius: 4,
                  color: "#4CAF6D", fontSize: 12, fontWeight: 700, padding: "7px 14px", cursor: "pointer",
                }}>✓ APPROVE</button>
                <button onClick={() => setRejecting(true)} style={{
                  background: "rgba(217,83,79,0.1)", border: "1px solid rgba(217,83,79,0.25)", borderRadius: 4,
                  color: "#D9534F", fontSize: 12, fontWeight: 700, padding: "7px 14px", cursor: "pointer",
                }}>✗ REJECT</button>
                <Link href={entityHref} style={{
                  fontSize: 12, color: "var(--text-faint)", textDecoration: "none",
                  border: "1px solid var(--border)", borderRadius: 4, padding: "7px 12px",
                }}>View Profile</Link>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export function GateQueuePanel({
  driverDocs, vehicleDocs, entity, statusFilter,
  suspended, expiringSoon, pendingReview, timezone = DEFAULT_TIMEZONE,
  isAdmin = false, onApprove, onReject,
}: Props) {
  const router = useRouter();

  const handleApprove = async (docId: string) => {
    if (onApprove) { onApprove(docId); return; }
    await fetch(`/api/compliance/${docId}/review`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "approve" }),
    });
    router.refresh();
  };

  const handleReject = async (docId: string, reason: string) => {
    if (onReject) { onReject(docId, reason); return; }
    await fetch(`/api/compliance/${docId}/review`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "reject", reason }),
    });
    router.refresh();
  };

  const allDocs = [...driverDocs, ...vehicleDocs].sort((a, b) => {
    if (!a.expiryDate && !b.expiryDate) return 0;
    if (!a.expiryDate) return 1;
    if (!b.expiryDate) return -1;
    return new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime();
  });

  return (
    <div style={{ display: "grid", gridTemplateColumns: "25% 75%", height: "100%" }}>
      {/* LEFT: filters */}
      <div style={{ borderRight: "1px solid var(--border)", padding: 20, overflowY: "auto" }}>
        <span className="panel-title" style={{ display: "block", marginBottom: 18 }}>Filter</span>

        <div style={{ marginBottom: 16 }}>
          <p style={{ fontSize: 10, color: "var(--text-faint)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 8, fontWeight: 700 }}>Entity</p>
          {["both", "drivers", "vehicles"].map(e => (
            <button key={e} onClick={() => router.push(`?entity=${e}&status=${statusFilter}`)}
              style={{
                display: "block", width: "100%", textAlign: "left", background: entity === e ? "var(--surface)" : "none",
                border: "none", borderRadius: 4, color: entity === e ? "var(--text)" : "var(--text-dim)",
                fontSize: 12, padding: "7px 10px", cursor: "pointer", marginBottom: 2, textTransform: "capitalize",
              }}>
              {e === "both" ? "Drivers & Vehicles" : e}
            </button>
          ))}
        </div>

        <div style={{ marginBottom: 16 }}>
          <p style={{ fontSize: 10, color: "var(--text-faint)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 8, fontWeight: 700 }}>Status</p>
          {[
            { value: "all",       label: "All" },
            { value: "pending",   label: "Pending Review" },
            { value: "expiring",  label: "Expiring Soon" },
            { value: "suspended", label: "Suspended" },
          ].map(s => (
            <button key={s.value} onClick={() => router.push(`?entity=${entity}&status=${s.value}`)}
              style={{
                display: "block", width: "100%", textAlign: "left", background: statusFilter === s.value ? "var(--surface)" : "none",
                border: "none", borderRadius: 4, color: statusFilter === s.value ? "var(--text)" : "var(--text-dim)",
                fontSize: 12, padding: "7px 10px", cursor: "pointer", marginBottom: 2,
              }}>
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* RIGHT: queue */}
      <div style={{ padding: 20, overflowY: "auto" }}>
        {/* Urgency summary */}
        <div style={{ display: "flex", gap: 12, marginBottom: 18 }}>
          <span className="chip chip-red">{suspended} Suspended</span>
          <span className="chip chip-amber">{expiringSoon} Expiring within 7 days</span>
          <span className="chip chip-blue">{pendingReview} Pending Review</span>
        </div>

        {allDocs.length === 0 ? (
          <div style={{ textAlign: "center", padding: "64px 0", color: "var(--text-faint)", fontSize: 13 }}>
            No documents match this filter
          </div>
        ) : (
          allDocs.map(doc => (
            <UploadDocCard
              key={doc.id}
              doc={doc}
              timezone={timezone}
              isAdmin={isAdmin}
              onApprove={isAdmin ? handleApprove : undefined}
              onReject={isAdmin ? handleReject : undefined}
            />
          ))
        )}
      </div>
    </div>
  );
}
