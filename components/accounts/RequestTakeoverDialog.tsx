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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface Props {
  accountId: string;
  currentOwnerType: string;
  currentOwnerId?: string | null;
  onClose: () => void;
}

export function RequestTakeoverDialog({ accountId, currentOwnerType, currentOwnerId, onClose }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [requestingPartyType, setRequestingPartyType] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!requestingPartyType) return;
    setLoading(true);
    setError(null);

    const res = await fetch("/api/takeover-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        accountId,
        currentOwnerType,
        currentOwnerId: currentOwnerId ?? null,
        requestingPartyType,
      }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "Failed to create request");
      return;
    }

    router.refresh();
    router.push(`/takeover-requests/${data.id}`);
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="bg-gray-900 border-gray-800 text-white max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-white">Request Takeover</DialogTitle>
        </DialogHeader>

        <div className="text-sm text-gray-400 space-y-1 pb-2">
          <p>Current owner: <span className="text-white">{currentOwnerType}</span></p>
        </div>

        {error && (
          <Alert variant="destructive" className="border-red-800 bg-red-950">
            <AlertDescription className="text-red-300">{error}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-gray-300">Requesting party</Label>
            <Select value={requestingPartyType} onValueChange={(v) => setRequestingPartyType(v ?? "")} required>
              <SelectTrigger className="bg-gray-800 border-gray-700">
                <SelectValue placeholder="Who is requesting?" />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-700">
                <SelectItem value="operator">Operator</SelectItem>
                <SelectItem value="lypx_direct">LyPX Direct</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-3 pt-1">
            <Button type="submit" disabled={loading || !requestingPartyType} size="sm">
              {loading ? "Submitting..." : "Submit Request"}
            </Button>
            <Button type="button" variant="outline" size="sm"
              className="border-gray-700 text-gray-300" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
