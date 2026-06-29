"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ChevronDown, ChevronUp, Pencil, Check, X } from "lucide-react";
import { AddDocumentDialog } from "./AddDocumentDialog";

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

const STATUS_BADGE: Record<string, string> = {
  pending_review: "border-yellow-700 text-yellow-300",
  verified:       "border-green-700  text-green-300",
  rejected:       "border-red-700    text-red-300",
  expired:        "border-gray-600   text-gray-400",
};

export interface InlineDoc {
  id:          string;
  docType:     string;
  status:      string;
  expiryDate:  string;   // ISO
  issuedDate:  string | null;
  hasFile:     boolean;
  isPdf:       boolean;
}

interface UploadProps {
  entityType: "driver" | "vehicle";
  entityId:   string;
}

interface DocState {
  status:      string;
  expiryDate:  string;
  issuedDate:  string;
  expanded:    boolean;
  editMode:    boolean;
  rejectMode:  boolean;
  rejectReason: string;
  loading:     boolean;
  error:       string | null;
}

function isoToDateInput(iso: string | null): string {
  if (!iso) return "";
  return iso.slice(0, 10);
}

export function InlineDocPanel({ docs, upload }: { docs: InlineDoc[]; upload?: UploadProps }) {
  const router = useRouter();
  const [showAdd, setShowAdd] = useState(false);

  const [states, setStates] = useState<Record<string, DocState>>(() =>
    Object.fromEntries(
      docs.map((d) => [
        d.id,
        {
          status:       d.status,
          expiryDate:   isoToDateInput(d.expiryDate),
          issuedDate:   isoToDateInput(d.issuedDate),
          expanded:     d.hasFile && d.status === "pending_review",
          editMode:     false,
          rejectMode:   false,
          rejectReason: "",
          loading:      false,
          error:        null,
        },
      ])
    )
  );

  function patch(id: string, update: Partial<DocState>) {
    setStates((prev) => ({ ...prev, [id]: { ...prev[id], ...update } }));
  }

  async function saveEdit(docId: string) {
    const s = states[docId];
    patch(docId, { loading: true, error: null });

    const res = await fetch(`/api/compliance/${docId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        expiryDate: s.expiryDate ? new Date(s.expiryDate).toISOString() : undefined,
        issuedDate: s.issuedDate ? new Date(s.issuedDate).toISOString() : null,
      }),
    });

    if (!res.ok) {
      const data = await res.json();
      patch(docId, { loading: false, error: data.error ?? "Save failed" });
      return;
    }

    patch(docId, { loading: false, editMode: false });
    router.refresh();
  }

  async function submitReview(docId: string, action: "approve" | "reject") {
    const s = states[docId];
    patch(docId, { loading: true, error: null });

    const res = await fetch(`/api/compliance/${docId}/review`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, reason: s.rejectReason }),
    });

    const data = await res.json();
    if (!res.ok) {
      patch(docId, { loading: false, error: data.error ?? "Failed" });
      return;
    }

    patch(docId, {
      loading:     false,
      status:      action === "approve" ? "verified" : "rejected",
      rejectMode:  false,
      rejectReason: "",
    });
    router.refresh();
  }

  return (
    <div className="space-y-3">
      {docs.length === 0 && (
        <p className="text-sm text-gray-600 py-2">No documents on file.</p>
      )}
      {docs.map((doc) => {
        const s = states[doc.id];
        return (
          <div key={doc.id} className="border border-gray-800 rounded-md overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-gray-900/60">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="text-sm text-white font-medium truncate">
                  {DOC_TYPE_LABELS[doc.docType] ?? doc.docType}
                </span>
                <Badge
                  variant="outline"
                  className={`text-xs py-0 shrink-0 ${STATUS_BADGE[s.status] ?? "border-gray-700 text-gray-400"}`}
                >
                  {s.status.replace("_", " ")}
                </Badge>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => patch(doc.id, { editMode: !s.editMode, error: null })}
                  className="text-gray-500 hover:text-gray-300 p-1"
                  title="Edit dates"
                >
                  <Pencil size={13} />
                </button>
                {doc.hasFile && (
                  <button
                    onClick={() => patch(doc.id, { expanded: !s.expanded })}
                    className="text-gray-500 hover:text-gray-300 p-1"
                  >
                    {s.expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                )}
              </div>
            </div>

            {/* Date display / edit */}
            <div className="px-4 py-2 border-t border-gray-800 bg-gray-950/40">
              {s.editMode ? (
                <div className="flex items-end gap-3 flex-wrap">
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">Expiry date</label>
                    <input
                      type="date"
                      value={s.expiryDate}
                      onChange={(e) => patch(doc.id, { expiryDate: e.target.value })}
                      className="bg-gray-800 border border-gray-700 text-white text-xs rounded px-2 py-1"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">Issued date</label>
                    <input
                      type="date"
                      value={s.issuedDate}
                      onChange={(e) => patch(doc.id, { issuedDate: e.target.value })}
                      className="bg-gray-800 border border-gray-700 text-white text-xs rounded px-2 py-1"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="h-7 text-xs bg-gray-700 hover:bg-gray-600"
                      disabled={s.loading}
                      onClick={() => saveEdit(doc.id)}
                    >
                      <Check size={12} className="mr-1" />
                      {s.loading ? "Saving…" : "Save"}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs text-gray-400"
                      onClick={() => patch(doc.id, { editMode: false })}
                    >
                      <X size={12} />
                    </Button>
                  </div>
                  {s.error && <p className="text-xs text-red-400 w-full">{s.error}</p>}
                </div>
              ) : (
                <p className="text-xs text-gray-500">
                  {s.issuedDate && <>Issued: <span className="text-gray-400">{s.issuedDate}</span> · </>}
                  Expires: <span className="text-gray-400">{s.expiryDate || "—"}</span>
                </p>
              )}
            </div>

            {/* Inline preview */}
            {s.expanded && doc.hasFile && (
              <div className="bg-black border-t border-gray-800">
                {doc.isPdf ? (
                  <iframe
                    src={`/api/compliance/${doc.id}/file`}
                    className="w-full border-0"
                    style={{ height: 480 }}
                    title={DOC_TYPE_LABELS[doc.docType] ?? doc.docType}
                  />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={`/api/compliance/${doc.id}/file`}
                    alt={DOC_TYPE_LABELS[doc.docType] ?? doc.docType}
                    className="w-full max-h-96 object-contain"
                  />
                )}
              </div>
            )}

            {!doc.hasFile && (
              <div className="px-4 py-2 border-t border-gray-800 text-xs text-gray-600 italic">
                No file uploaded
              </div>
            )}

            {/* Review actions for pending docs */}
            {s.status === "pending_review" && doc.hasFile && (
              <div className="px-4 py-3 border-t border-gray-800 space-y-2">
                {s.error && <p className="text-xs text-red-400">{s.error}</p>}
                {s.rejectMode ? (
                  <>
                    <Textarea
                      value={s.rejectReason}
                      onChange={(e) => patch(doc.id, { rejectReason: e.target.value })}
                      placeholder="Rejection reason…"
                      rows={2}
                      className="bg-gray-800 border-gray-700 text-white text-sm resize-none"
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="destructive"
                        disabled={!s.rejectReason.trim() || s.loading}
                        onClick={() => submitReview(doc.id, "reject")}
                      >
                        {s.loading ? "Rejecting…" : "Confirm Reject"}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-gray-700 text-gray-300"
                        onClick={() => patch(doc.id, { rejectMode: false, rejectReason: "" })}
                      >
                        Cancel
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="bg-green-700 hover:bg-green-600"
                      disabled={s.loading}
                      onClick={() => submitReview(doc.id, "approve")}
                    >
                      {s.loading ? "…" : "Approve"}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-red-800 text-red-400 hover:bg-red-950"
                      onClick={() => patch(doc.id, { rejectMode: true })}
                    >
                      Reject
                    </Button>
                  </div>
                )}
              </div>
            )}

            {s.status !== "pending_review" && (
              <div className="px-4 py-2 border-t border-gray-800 text-xs text-gray-600">
                {s.status === "verified" ? "✓ Verified" : s.status === "rejected" ? "✗ Rejected" : s.status}
              </div>
            )}
          </div>
        );
      })}

      {upload && (
        <div className="pt-1">
          <Button
            size="sm"
            variant="outline"
            className="border-gray-700 text-gray-300 text-xs"
            onClick={() => setShowAdd(true)}
          >
            + Upload Document
          </Button>
          <AddDocumentDialog
            open={showAdd}
            onClose={() => setShowAdd(false)}
            entityType={upload.entityType}
            entityId={upload.entityId}
          />
        </div>
      )}
    </div>
  );
}
