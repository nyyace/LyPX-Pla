"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface Props {
  submissionId: string;
  currentStatus: "pending" | "approved" | "flagged" | "rejected";
}

type ActionMode = "approve" | "reject" | "flag" | null;

export function SubmissionReviewActions({ submissionId, currentStatus }: Props) {
  const router = useRouter();
  const [mode, setMode] = useState<ActionMode>(null);
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!mode) return;
    setLoading(true);
    setError(null);

    const res = await fetch(`/api/submissions/${submissionId}/review`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: mode, reason, notes }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "Failed to submit review");
      return;
    }

    setMode(null);
    setReason("");
    setNotes("");
    router.refresh();
  }

  if (mode) {
    return (
      <div className="space-y-4 p-4 rounded-md border border-gray-800 bg-gray-950">
        <p className="text-sm font-medium text-white">
          {mode === "approve" && "Approve Submission"}
          {mode === "reject" && "Reject Submission"}
          {mode === "flag" && "Flag for Follow-up"}
        </p>

        {error && (
          <Alert variant="destructive" className="border-red-800 bg-red-950">
            <AlertDescription className="text-red-300">{error}</AlertDescription>
          </Alert>
        )}

        {(mode === "reject" || mode === "flag") && (
          <div className="space-y-1.5">
            <Label className="text-gray-300 text-xs">
              {mode === "reject" ? "Rejection reason *" : "Flag reason *"}
            </Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={
                mode === "reject"
                  ? "e.g. NRIC does not match submitted name"
                  : "e.g. License expiry date needs verification"
              }
              className="bg-gray-800 border-gray-700 text-white text-sm resize-none"
              rows={2}
            />
          </div>
        )}

        <div className="space-y-1.5">
          <Label className="text-gray-300 text-xs">Admin notes (optional)</Label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Internal notes for this review decision..."
            className="bg-gray-800 border-gray-700 text-white text-sm resize-none"
            rows={2}
          />
        </div>

        <div className="flex gap-2">
          {mode === "approve" && (
            <Button
              onClick={submit}
              disabled={loading}
              size="sm"
              className="bg-green-700 hover:bg-green-600"
            >
              {loading ? "Approving…" : "Confirm Approve"}
            </Button>
          )}
          {mode === "reject" && (
            <Button
              onClick={submit}
              disabled={loading || !reason.trim()}
              size="sm"
              variant="destructive"
            >
              {loading ? "Rejecting…" : "Confirm Reject"}
            </Button>
          )}
          {mode === "flag" && (
            <Button
              onClick={submit}
              disabled={loading || !reason.trim()}
              size="sm"
              className="bg-yellow-700 hover:bg-yellow-600 text-white"
            >
              {loading ? "Flagging…" : "Confirm Flag"}
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="border-gray-700 text-gray-300"
            onClick={() => { setMode(null); setReason(""); setNotes(""); setError(null); }}
          >
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-2 flex-wrap">
      {currentStatus !== "approved" && (
        <Button
          size="sm"
          className="bg-green-700 hover:bg-green-600"
          onClick={() => setMode("approve")}
        >
          Approve
        </Button>
      )}
      <Button
        size="sm"
        variant="outline"
        className="border-yellow-700 text-yellow-300 hover:bg-yellow-950"
        onClick={() => setMode("flag")}
      >
        Flag
      </Button>
      {currentStatus !== "rejected" && (
        <Button
          size="sm"
          variant="destructive"
          onClick={() => setMode("reject")}
        >
          Reject
        </Button>
      )}
    </div>
  );
}
