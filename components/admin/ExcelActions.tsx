"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Download, Upload, X } from "lucide-react";

interface ImportResult {
  row: number;
  action: "created" | "updated" | "skipped";
  name?: string;
  plate?: string;
  reason?: string;
}

interface ImportSummary {
  created: number;
  updated: number;
  skipped: number;
  results: ImportResult[];
}

interface Props {
  entityType: "drivers" | "vehicles";
}

export function ExcelActions({ entityType }: Props) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  async function handleExport() {
    const res = await fetch(`/api/admin/${entityType}/export`);
    if (!res.ok) { alert("Export failed"); return; }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = res.headers.get("Content-Disposition")?.match(/filename="(.+)"/)?.[1]
      ?? `${entityType}-export.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setImportError(null);
    setSummary(null);

    const form = new FormData();
    form.append("file", file);

    try {
      const res = await fetch(`/api/admin/${entityType}/import`, { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) {
        setImportError(data.error ?? "Import failed");
      } else {
        setSummary(data as ImportSummary);
        router.refresh();
      }
    } catch {
      setImportError("Network error during import");
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <>
      <input
        ref={fileRef}
        type="file"
        accept=".xlsx,.xls"
        className="hidden"
        onChange={handleFileChange}
      />

      <Button
        size="sm"
        variant="outline"
        className="border-gray-700 text-gray-300 gap-1.5"
        onClick={handleExport}
      >
        <Download size={13} />
        Export
      </Button>

      <Button
        size="sm"
        variant="outline"
        className="border-gray-700 text-gray-300 gap-1.5"
        disabled={importing}
        onClick={() => fileRef.current?.click()}
      >
        <Upload size={13} />
        {importing ? "Importing..." : "Import"}
      </Button>

      {importError && (
        <p className="text-xs text-red-400">{importError}</p>
      )}

      <Dialog open={!!summary} onOpenChange={(o) => !o && setSummary(null)}>
        <DialogContent className="bg-gray-900 border-gray-800 text-white max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center justify-between">
              Import Results
              <button onClick={() => setSummary(null)} className="text-gray-500 hover:text-gray-300">
                <X size={16} />
              </button>
            </DialogTitle>
          </DialogHeader>
          {summary && (
            <div className="space-y-4">
              <div className="flex gap-6 text-sm">
                <span className="text-green-400">{summary.created} created</span>
                <span className="text-blue-400">{summary.updated} updated</span>
                <span className="text-yellow-400">{summary.skipped} skipped</span>
              </div>
              {summary.skipped > 0 && (
                <div className="space-y-1 max-h-60 overflow-y-auto">
                  <p className="text-xs text-gray-500 mb-2">Skipped rows:</p>
                  {summary.results
                    .filter((r) => r.action === "skipped")
                    .map((r) => (
                      <div key={r.row} className="text-xs text-yellow-300 bg-yellow-950/30 rounded px-2 py-1">
                        Row {r.row} — {r.name ?? r.plate}: {r.reason}
                      </div>
                    ))}
                </div>
              )}
              <Button size="sm" onClick={() => setSummary(null)}>Close</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
