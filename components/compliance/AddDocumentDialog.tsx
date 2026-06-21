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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";

const driverDocTypes = ["license", "background_check", "insurance"];
const vehicleDocTypes = ["registration", "inspection", "insurance"];

interface Props {
  open: boolean;
  onClose: () => void;
  entityType: "driver" | "vehicle";
  entityId: string;
}

export function AddDocumentDialog({ open, onClose, entityType, entityId }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [docType, setDocType] = useState("");

  const docTypes = entityType === "driver" ? driverDocTypes : vehicleDocTypes;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const form = new FormData(e.currentTarget);

    const res = await fetch("/api/compliance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        entityType,
        entityId,
        docType: form.get("docType"),
        expiryDate: form.get("expiryDate"),
      }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "Failed to upload document");
      return;
    }

    router.refresh();
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="bg-gray-900 border-gray-800 text-white max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-white">Upload Compliance Document</DialogTitle>
        </DialogHeader>

        {error && (
          <Alert variant="destructive" className="border-red-800 bg-red-950">
            <AlertDescription className="text-red-300">{error}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-gray-300">Document type</Label>
            <Select name="docType" value={docType} onValueChange={(v) => setDocType(v ?? "")} required>
              <SelectTrigger className="bg-gray-800 border-gray-700">
                <SelectValue placeholder="Select type..." />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-700">
                {docTypes.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t.replace("_", " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="expiryDate" className="text-gray-300">Expiry date</Label>
            <Input
              id="expiryDate"
              name="expiryDate"
              type="date"
              required
              className="bg-gray-800 border-gray-700"
            />
          </div>

          <div className="flex gap-3 pt-1">
            <Button type="submit" disabled={loading} size="sm">
              {loading ? "Saving..." : "Add Document"}
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
        </form>
      </DialogContent>
    </Dialog>
  );
}
