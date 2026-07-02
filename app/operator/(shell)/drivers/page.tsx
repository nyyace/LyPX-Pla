"use client";

import { useEffect, useState, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface RosterDriver {
  driverId: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  licenseNumber: string | null;
  complianceStatus: string;
  centralPoolEligible: boolean;
  relationshipType: string;
  tier1Member: boolean;
  addedAt: string;
  activeJobCount: number;
}

const COMPLIANCE_BADGE: Record<string, string> = {
  active:        "border-green-700 text-green-300",
  expiring_soon: "border-yellow-700 text-yellow-300",
  suspended:     "border-red-700 text-red-300",
  pending:       "border-gray-600 text-gray-400",
};

export default function OperatorRosterPage() {
  const [roster, setRoster] = useState<RosterDriver[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);
  const [confirmDriver, setConfirmDriver] = useState<RosterDriver | null>(null);
  const [removeError, setRemoveError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/operator/drivers");
      if (!res.ok) throw new Error("Failed to load roster");
      setRoster(await res.json());
    } catch {
      setError("Could not load driver roster.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function confirmRemove() {
    if (!confirmDriver) return;
    setRemoving(confirmDriver.driverId);
    setRemoveError(null);
    try {
      const res = await fetch(`/api/operator/drivers/${confirmDriver.driverId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        setRemoveError(data.error ?? "Failed to remove driver");
        setRemoving(null);
        return;
      }
      setConfirmDriver(null);
      setRemoving(null);
      await load();
    } catch {
      setRemoveError("Network error");
      setRemoving(null);
    }
  }

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* Header */}
      <div style={{ padding: "20px 24px 16px", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
        <h1 style={{ fontSize: 18, fontWeight: 700, color: "var(--text)", margin: 0 }}>Driver Roster</h1>
        <p style={{ fontSize: 12, color: "var(--text-dim)", margin: "4px 0 0" }}>
          Drivers linked to your operator account
        </p>
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflow: "auto", padding: "16px 24px" }}>
        {loading && (
          <p className="text-sm text-gray-500 py-8 text-center">Loading roster…</p>
        )}
        {error && (
          <p className="text-sm text-red-400 py-8 text-center">{error}</p>
        )}
        {!loading && !error && roster.length === 0 && (
          <p className="text-sm text-gray-600 py-8 text-center">No drivers on your roster yet.</p>
        )}
        {!loading && !error && roster.length > 0 && (
          <div className="rounded-md border border-gray-800 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800 text-xs text-gray-500">
                  <th className="text-left px-4 py-3 font-medium">Name</th>
                  <th className="text-left px-4 py-3 font-medium">Phone</th>
                  <th className="text-left px-4 py-3 font-medium">Licence</th>
                  <th className="text-left px-4 py-3 font-medium">Type</th>
                  <th className="text-left px-4 py-3 font-medium">Compliance</th>
                  <th className="text-left px-4 py-3 font-medium">Active Jobs</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {roster.map((d) => (
                  <tr key={d.driverId} className="border-b border-gray-800 last:border-0 hover:bg-gray-900/40">
                    <td className="px-4 py-3 font-medium text-white">
                      {d.firstName} {d.lastName}
                    </td>
                    <td className="px-4 py-3 text-gray-400 font-mono text-xs">{d.phoneNumber}</td>
                    <td className="px-4 py-3 text-gray-400 font-mono text-xs">{d.licenseNumber ?? "—"}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs capitalize">{d.relationshipType}</td>
                    <td className="px-4 py-3">
                      <Badge
                        variant="outline"
                        className={`text-xs py-0 ${COMPLIANCE_BADGE[d.complianceStatus] ?? "border-gray-600 text-gray-400"}`}
                      >
                        {d.complianceStatus.replace("_", " ")}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs">
                      {d.activeJobCount > 0 ? (
                        <span className="text-yellow-400">{d.activeJobCount} active</span>
                      ) : "0"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-red-800/60 text-red-400 hover:bg-red-950 text-xs h-7"
                        disabled={d.activeJobCount > 0}
                        title={d.activeJobCount > 0 ? "Driver has active jobs — cannot remove" : "Remove from roster"}
                        onClick={() => { setRemoveError(null); setConfirmDriver(d); }}
                      >
                        Remove
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Confirmation dialog */}
      <Dialog open={!!confirmDriver} onOpenChange={(o) => { if (!o) { setConfirmDriver(null); setRemoveError(null); } }}>
        <DialogContent className="bg-gray-900 border-gray-800 text-white max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-white">Remove from Roster</DialogTitle>
          </DialogHeader>
          {confirmDriver && (
            <div className="space-y-4">
              <p className="text-sm text-gray-300">
                Remove <span className="text-white font-medium">{confirmDriver.firstName} {confirmDriver.lastName}</span> from
                your roster?
              </p>
              <p className="text-xs text-gray-500">
                This driver will be removed from your roster only. They remain active on the LyPX platform and can be
                re-added in future.
              </p>
              {removeError && (
                <p className="text-xs text-red-400">{removeError}</p>
              )}
              <div className="flex gap-3">
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={removing === confirmDriver.driverId}
                  onClick={confirmRemove}
                >
                  {removing === confirmDriver.driverId ? "Removing…" : "Confirm Remove"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-gray-700 text-gray-300"
                  onClick={() => { setConfirmDriver(null); setRemoveError(null); }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
