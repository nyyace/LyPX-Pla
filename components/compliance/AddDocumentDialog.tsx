"use client";

import { useState, useRef } from "react";
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
import { Upload, FileText, X, AlertTriangle } from "lucide-react";

const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/heic", "application/pdf"];
const MAX_SIZE = 5 * 1024 * 1024;

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
  const fileRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [docType, setDocType] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploadMode, setUploadMode] = useState<"file" | "manual">("file");
  const [note, setNote] = useState("");

  const docTypes = entityType === "driver" ? driverDocTypes : vehicleDocTypes;

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    if (!f) return;
    if (!ALLOWED_TYPES.includes(f.type)) {
      setError("Only JPG, PNG, WEBP, HEIC and PDF files are accepted.");
      e.target.value = "";
      return;
    }
    if (f.size > MAX_SIZE) {
      setError("File must be under 5 MB.");
      e.target.value = "";
      return;
    }
    setError(null);
    setFile(f);
  }

  function handleClose() {
    setDocType("");
    setFile(null);
    setNote("");
    setError(null);
    setUploadMode("file");
    onClose();
  }

  function switchMode(mode: "file" | "manual") {
    setUploadMode(mode);
    setError(null);
    setFile(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const form = new FormData(e.currentTarget);

    if (uploadMode === "manual") {
      const res = await fetch("/api/admin/compliance/manual-entry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entityType,
          entityId,
          docType: form.get("docType"),
          expiryDate: form.get("expiryDate"),
          issuedDate: form.get("issuedDate") || undefined,
          note: note.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to save manual entry");
        setLoading(false);
        return;
      }
    } else {
      if (!file) {
        setError("Please select a file to upload.");
        setLoading(false);
        return;
      }

      const createRes = await fetch("/api/compliance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entityType,
          entityId,
          docType: form.get("docType"),
          expiryDate: form.get("expiryDate"),
        }),
      });
      const createData = await createRes.json();
      if (!createRes.ok) {
        setError(createData.error ?? "Failed to create document record");
        setLoading(false);
        return;
      }

      const uploadForm = new FormData();
      uploadForm.append("file", file);
      const uploadRes = await fetch(`/api/compliance/${createData.id}/upload`, {
        method: "POST",
        body: uploadForm,
      });
      if (!uploadRes.ok) {
        const uploadData = await uploadRes.json().catch(() => ({}));
        setError(uploadData.error ?? "File upload failed");
        setLoading(false);
        return;
      }
    }

    setLoading(false);
    router.refresh();
    handleClose();
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="bg-gray-900 border-gray-800 text-white max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-white">
            {uploadMode === "file" ? "Upload Compliance Document" : "Manual Compliance Entry"}
          </DialogTitle>
        </DialogHeader>

        {/* Mode tabs */}
        <div className="flex rounded-md border border-gray-700 overflow-hidden text-xs">
          <button
            type="button"
            onClick={() => switchMode("file")}
            className={`flex-1 py-1.5 text-center transition-colors ${
              uploadMode === "file"
                ? "bg-gray-700 text-white"
                : "text-gray-400 hover:text-gray-200"
            }`}
          >
            Upload File
          </button>
          <button
            type="button"
            onClick={() => switchMode("manual")}
            className={`flex-1 py-1.5 text-center transition-colors ${
              uploadMode === "manual"
                ? "bg-gray-700 text-white"
                : "text-gray-400 hover:text-gray-200"
            }`}
          >
            Manual Entry
          </button>
        </div>

        {uploadMode === "manual" && (
          <div className="flex items-start gap-2 rounded-md border border-amber-700 bg-amber-950/50 px-3 py-2 text-xs text-amber-300">
            <AlertTriangle size={13} className="mt-0.5 shrink-0 text-amber-400" />
            <span>No file will be attached. Use only when a physical document has been verified in person.</span>
          </div>
        )}

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
                    {t.replace(/_/g, " ")}
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

          {uploadMode === "manual" && (
            <div className="space-y-1.5">
              <Label htmlFor="issuedDate" className="text-gray-300">
                Issued date <span className="text-gray-600 font-normal">(optional)</span>
              </Label>
              <Input
                id="issuedDate"
                name="issuedDate"
                type="date"
                className="bg-gray-800 border-gray-700"
              />
            </div>
          )}

          {uploadMode === "file" && (
            <div className="space-y-1.5">
              <Label className="text-gray-300">File <span className="text-red-400">*</span></Label>
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp,image/heic,application/pdf"
                onChange={handleFileChange}
                className="hidden"
              />
              {file ? (
                <div className="flex items-center gap-2 px-3 py-2 rounded-md border border-green-800 bg-green-950">
                  <FileText size={14} className="text-green-400 flex-shrink-0" />
                  <span className="text-xs text-green-300 truncate flex-1">
                    {file.name}{" "}
                    <span className="text-green-600">({(file.size / 1024 / 1024).toFixed(1)} MB)</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => { setFile(null); if (fileRef.current) fileRef.current.value = ""; }}
                    className="text-gray-500 hover:text-red-400 flex-shrink-0"
                  >
                    <X size={12} />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="w-full flex flex-col items-center gap-1 px-3 py-3 rounded-md border border-dashed border-gray-700 hover:border-gray-500 text-gray-500 hover:text-gray-300 transition-colors text-xs"
                >
                  <span className="flex items-center gap-2"><Upload size={14} /> Click to browse</span>
                  <span className="text-gray-700">JPG · PNG · WEBP · HEIC · PDF · max 5 MB</span>
                </button>
              )}
            </div>
          )}

          {uploadMode === "manual" && (
            <div className="space-y-1.5">
              <Label htmlFor="note" className="text-gray-300">
                Note <span className="text-gray-600 font-normal">(optional)</span>
              </Label>
              <textarea
                id="note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. Verified original document in office on 2026-06-30"
                rows={2}
                className="w-full rounded-md border border-gray-700 bg-gray-800 text-white text-sm px-3 py-2 resize-none placeholder:text-gray-600 focus:outline-none focus:ring-1 focus:ring-gray-500"
              />
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <Button
              type="submit"
              disabled={loading || (uploadMode === "file" && !file)}
              size="sm"
            >
              {loading
                ? uploadMode === "manual" ? "Saving..." : "Uploading..."
                : uploadMode === "manual" ? "Save Manual Entry" : "Upload Document"}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="border-gray-700 text-gray-300"
              onClick={handleClose}
            >
              Cancel
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
