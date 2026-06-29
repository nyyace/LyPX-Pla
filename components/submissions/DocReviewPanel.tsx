"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronUp } from "lucide-react";

export interface DocEntry {
  id:              string;
  label:           string;
  status:          string;
  hasFile:         boolean;
  isPdf:           boolean;
  crossCheckNote?: string;
}

interface DocState {
  status:   string;
  expanded: boolean;
  mode:     "reject" | null;
  reason:   string;
  loading:  boolean;
  error:    string | null;
}

const statusBadge: Record<string, string> = {
  pending_review: "border-yellow-700 text-yellow-300",
  verified:       "border-green-700  text-green-300",
  rejected:       "border-red-700    text-red-300",
  expired:        "border-gray-600   text-gray-400",
};

const statusLabel: Record<string, string> = {
  pending_review: "Pending",
  verified:       "Verified",
  rejected:       "Rejected",
  expired:        "Expired",
};

export function DocReviewPanel({ docs }: { docs: DocEntry[] }) {
  const router = useRouter();

  const [states, setStates] = useState<Record<string, DocState>>(() =>
    Object.fromEntries(
      docs.map((d) => [
        d.id,
        {
          status:   d.status,
          expanded: d.hasFile && d.status === "pending_review",
          mode:     null,
          reason:   "",
          loading:  false,
          error:    null,
        },
      ])
    )
  );

  function patch(id: string, update: Partial<DocState>) {
    setStates((prev) => ({ ...prev, [id]: { ...prev[id], ...update } }));
  }

  async function submitReview(docId: string, action: "approve" | "reject") {
    const s = states[docId];
    patch(docId, { loading: true, error: null });

    const res = await fetch(`/api/compliance/${docId}/review`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ action, reason: s.reason }),
    });

    const data = await res.json();

    if (!res.ok) {
      patch(docId, { loading: false, error: data.error ?? "Failed" });
      return;
    }

    patch(docId, {
      loading:  false,
      status:   action === "approve" ? "verified" : "rejected",
      mode:     null,
      reason:   "",
    });

    router.refresh();
  }

  return (
    <div className="space-y-3">
      {docs.map((doc) => {
        const s = states[doc.id];
        return (
          <div key={doc.id} className="border border-gray-800 rounded-md overflow-hidden">
            {/* Header row */}
            <div className="flex items-center justify-between px-4 py-3 bg-gray-900/60">
              <div className="flex items-center gap-2.5">
                <span className="text-sm text-white font-medium">{doc.label}</span>
                <Badge
                  variant="outline"
                  className={`text-xs py-0 ${statusBadge[s.status] ?? "border-gray-700 text-gray-400"}`}
                >
                  {statusLabel[s.status] ?? s.status}
                </Badge>
              </div>
              {doc.hasFile && (
                <button
                  onClick={() => patch(doc.id, { expanded: !s.expanded })}
                  className="text-gray-500 hover:text-gray-300 transition-colors"
                  aria-label={s.expanded ? "Collapse document" : "Expand document"}
                >
                  {s.expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
              )}
            </div>

            {/* Inline viewer */}
            {s.expanded && doc.hasFile && (
              <div className="bg-black border-t border-gray-800">
                {doc.isPdf ? (
                  <iframe
                    src={`/api/compliance/${doc.id}/file`}
                    className="w-full border-0"
                    style={{ height: "480px" }}
                    title={doc.label}
                  />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={`/api/compliance/${doc.id}/file`}
                    alt={doc.label}
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

            {/* Cross-check note */}
            {doc.crossCheckNote && (
              <div className="px-4 py-2 border-t border-gray-800 bg-gray-950 text-xs text-gray-500">
                {doc.crossCheckNote}
              </div>
            )}

            {/* Review actions */}
            {s.status === "pending_review" && doc.hasFile && (
              <div className="px-4 py-3 border-t border-gray-800 space-y-2">
                {s.error && (
                  <p className="text-xs text-red-400">{s.error}</p>
                )}

                {s.mode === "reject" ? (
                  <>
                    <Textarea
                      value={s.reason}
                      onChange={(e) => patch(doc.id, { reason: e.target.value })}
                      placeholder="Reason for rejection (shown in audit log)..."
                      rows={2}
                      className="bg-gray-800 border-gray-700 text-white text-sm resize-none"
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="destructive"
                        disabled={!s.reason.trim() || s.loading}
                        onClick={() => submitReview(doc.id, "reject")}
                      >
                        {s.loading ? "Rejecting…" : "Confirm Reject"}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-gray-700 text-gray-300"
                        onClick={() => patch(doc.id, { mode: null, reason: "" })}
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
                      onClick={() => patch(doc.id, { mode: "reject" })}
                    >
                      Reject
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Reviewed state */}
            {s.status !== "pending_review" && (
              <div className="px-4 py-2 border-t border-gray-800 text-xs text-gray-600">
                {s.status === "verified" ? "✓ Approved" : s.status === "rejected" ? "✗ Rejected" : s.status}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
