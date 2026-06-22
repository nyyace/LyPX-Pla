"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { formatTZDate, DEFAULT_TIMEZONE } from "@/lib/utils/date";

interface Doc {
  id: string;
  docType: string;
  expiryDate: Date;
}

interface Props {
  doc: Doc;
  onClose: () => void;
  timezone?: string;
}

export function ReviewDocumentDialog({ doc, onClose, timezone = DEFAULT_TIMEZONE }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState("");

  async function submit(decision: "verified" | "rejected") {
    setLoading(true);
    setError(null);

    const res = await fetch(`/api/compliance/${doc.id}/review`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ decision, notes }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "Failed to submit review");
      return;
    }

    router.refresh();
    onClose();
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="bg-gray-900 border-gray-800 text-white max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-white">Review Document</DialogTitle>
        </DialogHeader>

        <div className="text-sm text-gray-400 space-y-1">
          <p>Type: <span className="text-white">{doc.docType.replace("_", " ")}</span></p>
          <p>Expires: <span className="text-white">{formatTZDate(doc.expiryDate, timezone)}</span></p>
        </div>

        {error && (
          <Alert variant="destructive" className="border-red-800 bg-red-950">
            <AlertDescription className="text-red-300">{error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-1.5">
          <Label className="text-gray-300">Notes (optional)</Label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Reason for rejection or verification notes..."
            className="bg-gray-800 border-gray-700 text-white text-sm resize-none"
            rows={3}
          />
        </div>

        <div className="flex gap-3 pt-1">
          <Button
            onClick={() => submit("verified")}
            disabled={loading}
            size="sm"
            className="bg-green-700 hover:bg-green-600"
          >
            Approve
          </Button>
          <Button
            onClick={() => submit("rejected")}
            disabled={loading}
            variant="destructive"
            size="sm"
          >
            Reject
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="border-gray-700 text-gray-300"
            onClick={onClose}
          >
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
