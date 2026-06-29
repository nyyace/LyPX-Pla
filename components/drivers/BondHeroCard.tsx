"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ActiveBond {
  id:              string;
  relationshipType: "owned" | "contracted";
  contractStatus:  string | null;
  contractExpiry:  string | null; // ISO
  verifiedAt:      string | null; // ISO
  verifiedBy:      string | null;
  notes:           string | null;
  vehicle: {
    id:           string;
    plateNumber:  string;
    make:         string;
    model:        string;
    vehicleClass: string | null;
    status:       string;
  };
}

export interface PastBond {
  id:              string;
  relationshipType: string;
  terminatedAt:    string | null; // ISO
  notes:           string | null;
  vehicle: {
    plateNumber: string;
    make:        string;
    model:       string;
  };
}

interface Props {
  driverId:   string;
  activeBond: ActiveBond | null;
  pastBonds:  PastBond[];
}

// ─── Constants ───────────────────────────────────────────────────────────────

const VEHICLE_CLASS_LABELS: Record<string, string> = {
  standard_sedan:           "Standard Sedan",
  standard_mpv_nve:         "Standard MPV (NVE)",
  executive_sedan_eclass:   "Executive Sedan (E-Class)",
  luxury_sedan_sclass:      "Luxury Sedan (S-Class)",
  executive_mpv_avf:        "Executive MPV (AVF)",
  prestige_mpv_lexus:       "Prestige MPV (Lexus)",
  luxury_executive_van_vvv: "Luxury Executive Van (VVV)",
  group_van_combi:          "Group Van (Combi)",
  prestige_collection:      "Prestige Collection",
};

type BondStatus = "none" | "unverified" | "expiring" | "expired" | "active";

function getBondStatus(bond: ActiveBond | null): BondStatus {
  if (!bond) return "none";
  if (!bond.verifiedAt) return "unverified";
  if (bond.relationshipType === "contracted") {
    if (!bond.contractExpiry) return "unverified";
    const daysLeft = Math.floor(
      (new Date(bond.contractExpiry).getTime() - Date.now()) / 86_400_000
    );
    if (daysLeft < 0) return "expired";
    if (daysLeft < 30) return "expiring";
  }
  return "active";
}

const CARD_STYLES: Record<BondStatus, string> = {
  none:       "border-gray-700  bg-gray-800/40",
  unverified: "border-yellow-800 bg-yellow-900/15",
  expiring:   "border-yellow-800 bg-yellow-900/15",
  expired:    "border-red-800    bg-red-900/15",
  active:     "border-green-800  bg-green-900/15",
};

const ICON_COLOR: Record<BondStatus, string> = {
  none:       "text-gray-500",
  unverified: "text-yellow-400",
  expiring:   "text-yellow-400",
  expired:    "text-red-400",
  active:     "text-green-400",
};

const ICONS: Record<BondStatus, string> = {
  none: "○", unverified: "⚠", expiring: "⚠", expired: "✗", active: "✓",
};

// ─── Component ───────────────────────────────────────────────────────────────

export function BondHeroCard({ driverId, activeBond, pastBonds }: Props) {
  const router  = useRouter();
  const status  = getBondStatus(activeBond);

  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError]     = useState<string | null>(null);
  const [showReplace, setShowReplace]     = useState(false);
  const [showAssign, setShowAssign]       = useState(false);

  // ── Verify bond ────────────────────────────────────────────────────────────
  async function verifyBond() {
    if (!activeBond) return;
    setActionLoading(true);
    setActionError(null);
    const res = await fetch(`/api/admin/vehicle-assignments/${activeBond.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "verify" }),
    });
    setActionLoading(false);
    if (!res.ok) {
      const d = await res.json();
      setActionError(d.error ?? "Failed to verify");
      return;
    }
    router.refresh();
  }

  // ── Terminate bond ─────────────────────────────────────────────────────────
  async function terminateBond() {
    if (!activeBond) return;
    if (!confirm("Terminate this vehicle assignment? This cannot be undone.")) return;
    setActionLoading(true);
    setActionError(null);
    const res = await fetch(`/api/admin/vehicle-assignments/${activeBond.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "terminate" }),
    });
    setActionLoading(false);
    if (!res.ok) {
      const d = await res.json();
      setActionError(d.error ?? "Failed to terminate");
      return;
    }
    router.refresh();
  }

  const daysLeft = activeBond?.contractExpiry
    ? Math.floor((new Date(activeBond.contractExpiry).getTime() - Date.now()) / 86_400_000)
    : null;

  return (
    <>
      <div className={`rounded-lg border p-5 mb-6 ${CARD_STYLES[status]}`}>
        <div className="flex items-start justify-between gap-4">

          {/* Left: Bond info */}
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-lg font-bold ${ICON_COLOR[status]}`}>
                {ICONS[status]}
              </span>
              <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                Vehicle Bond
              </span>
            </div>

            {status === "none" ? (
              <p className="text-sm text-gray-500">No vehicle currently assigned to this driver.</p>
            ) : activeBond ? (
              <>
                <p className="text-base font-semibold text-white">
                  {activeBond.vehicle.make} {activeBond.vehicle.model}
                  <span className="ml-2 font-mono text-gray-300">{activeBond.vehicle.plateNumber}</span>
                </p>
                <p className="text-sm text-gray-400 mt-0.5">
                  {VEHICLE_CLASS_LABELS[activeBond.vehicle.vehicleClass ?? ""] ||
                    activeBond.vehicle.vehicleClass ||
                    <span className="text-orange-400">No class set</span>}
                  {" · "}
                  {activeBond.relationshipType === "owned" ? "Owned" : "Rental"}
                </p>

                <div className="mt-2 space-y-0.5">
                  {activeBond.relationshipType === "contracted" && activeBond.contractExpiry && (
                    <p className={`text-sm font-medium ${
                      (daysLeft ?? 0) < 0 ? "text-red-400" :
                      (daysLeft ?? 0) < 30 ? "text-yellow-400" : "text-gray-400"
                    }`}>
                      Rental {(daysLeft ?? 0) < 0 ? "expired" : "expires"}:{" "}
                      {new Date(activeBond.contractExpiry).toLocaleDateString("en-SG")}
                      {(daysLeft ?? 0) >= 0 && ` (${daysLeft} days)`}
                    </p>
                  )}

                  {activeBond.verifiedAt ? (
                    <p className="text-xs text-gray-500">
                      Verified on {new Date(activeBond.verifiedAt).toLocaleDateString("en-SG")}
                    </p>
                  ) : (
                    <p className="text-xs text-yellow-400 font-medium">Not yet verified by admin</p>
                  )}

                  {activeBond.notes && (
                    <p className="text-xs text-gray-500 italic mt-1">Note: {activeBond.notes}</p>
                  )}
                </div>
              </>
            ) : null}
          </div>

          {/* Right: Action buttons */}
          <div className="flex flex-col gap-2 shrink-0">
            {status === "none" ? (
              <Button
                size="sm"
                className="bg-gray-700 hover:bg-gray-600 text-white"
                onClick={() => setShowAssign(true)}
              >
                + Assign Vehicle
              </Button>
            ) : (
              <>
                {!activeBond?.verifiedAt && (
                  <Button
                    size="sm"
                    className="bg-blue-700 hover:bg-blue-600"
                    disabled={actionLoading}
                    onClick={verifyBond}
                  >
                    {actionLoading ? "…" : "Verify Bond"}
                  </Button>
                )}
                {activeBond?.relationshipType === "contracted" && (
                  <UpdateExpiryButton bondId={activeBond.id} currentExpiry={activeBond.contractExpiry} />
                )}
                <Button
                  size="sm"
                  variant="outline"
                  className="border-gray-600 text-gray-300 hover:bg-gray-800"
                  onClick={() => setShowReplace(true)}
                >
                  Replace Vehicle
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-red-800 text-red-400 hover:bg-red-950"
                  disabled={actionLoading}
                  onClick={terminateBond}
                >
                  Terminate Bond
                </Button>
              </>
            )}
          </div>
        </div>

        {actionError && (
          <p className="text-xs text-red-400 mt-3">{actionError}</p>
        )}

        {/* Bond History */}
        {pastBonds.length > 0 && (
          <details className="mt-4">
            <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-300 select-none">
              Bond history ({pastBonds.length} previous assignment{pastBonds.length > 1 ? "s" : ""})
            </summary>
            <div className="mt-3 space-y-2">
              {pastBonds.map((bond) => (
                <div key={bond.id} className="p-3 bg-gray-900/60 rounded border border-gray-800 opacity-70 text-sm">
                  <div className="flex justify-between items-start">
                    <span className="font-medium font-mono text-gray-300">{bond.vehicle.plateNumber}</span>
                    <span className="text-gray-600 text-xs">
                      {bond.relationshipType === "owned" ? "Owned" : "Rental"}
                    </span>
                  </div>
                  <p className="text-gray-500 text-xs mt-0.5">
                    {bond.vehicle.make} {bond.vehicle.model}
                    {bond.terminatedAt && ` · Terminated ${new Date(bond.terminatedAt).toLocaleDateString("en-SG")}`}
                    {bond.notes && ` · ${bond.notes}`}
                  </p>
                </div>
              ))}
            </div>
          </details>
        )}
      </div>

      {/* Replace Vehicle Modal */}
      {showReplace && activeBond && (
        <ReplaceVehicleModal
          driverId={driverId}
          activeBond={activeBond}
          onClose={() => setShowReplace(false)}
          onSuccess={() => { setShowReplace(false); router.refresh(); }}
        />
      )}

      {/* Assign Vehicle Modal (for no-bond state) */}
      {showAssign && (
        <AssignVehicleModal
          driverId={driverId}
          onClose={() => setShowAssign(false)}
          onSuccess={() => { setShowAssign(false); router.refresh(); }}
        />
      )}
    </>
  );
}

// ─── Update Expiry inline button ──────────────────────────────────────────────

function UpdateExpiryButton({ bondId, currentExpiry }: { bondId: string; currentExpiry: string | null }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [expiry, setExpiry]   = useState(currentExpiry ? currentExpiry.slice(0, 10) : "");
  const [loading, setLoading] = useState(false);

  async function save() {
    setLoading(true);
    const res = await fetch(`/api/admin/vehicle-assignments/${bondId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "update_expiry", contractExpiry: expiry ? new Date(expiry).toISOString() : null }),
    });
    setLoading(false);
    if (res.ok) { setEditing(false); router.refresh(); }
  }

  if (editing) {
    return (
      <div className="flex items-center gap-1">
        <input
          type="date"
          value={expiry}
          onChange={(e) => setExpiry(e.target.value)}
          className="bg-gray-800 border border-gray-700 text-white text-xs rounded px-2 py-1 w-32"
        />
        <Button size="sm" className="h-7 text-xs bg-gray-700 hover:bg-gray-600" disabled={loading} onClick={save}>
          {loading ? "…" : "Save"}
        </Button>
        <Button size="sm" variant="ghost" className="h-7 text-xs text-gray-400" onClick={() => setEditing(false)}>×</Button>
      </div>
    );
  }

  return (
    <Button
      size="sm"
      variant="outline"
      className="border-gray-600 text-gray-300 hover:bg-gray-800"
      onClick={() => setEditing(true)}
    >
      Update Expiry
    </Button>
  );
}

// ─── Replace Vehicle Modal ────────────────────────────────────────────────────

interface VehicleResult {
  id: string; plateNumber: string; make: string; model: string;
  vehicleClass: string | null; status: string;
}

function ReplaceVehicleModal({
  driverId, activeBond, onClose, onSuccess,
}: {
  driverId: string;
  activeBond: ActiveBond;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [step, setStep]         = useState<"reason" | "vehicle" | "bond">("reason");
  const [note, setNote]         = useState("");
  const [search, setSearch]     = useState("");
  const [vehicles, setVehicles] = useState<VehicleResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<VehicleResult | null>(null);
  const [bondType, setBondType] = useState<"owned" | "contracted">("owned");
  const [expiry, setExpiry]     = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) { setVehicles([]); return; }
    setSearching(true);
    const res = await fetch(`/api/admin/vehicles?search=${encodeURIComponent(q)}`);
    const data = await res.json();
    setVehicles(Array.isArray(data) ? data : []);
    setSearching(false);
  }, []);

  async function handleReplace() {
    if (!selected) return;
    setLoading(true);
    setError("");
    try {
      // 1. Terminate current bond
      await fetch(`/api/admin/vehicle-assignments/${activeBond.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "terminate", notes: note }),
      });

      // 2. Create new bond
      const res = await fetch("/api/admin/vehicle-assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          driverId,
          vehicleId:        selected.id,
          relationshipType: bondType,
          contractExpiry:   bondType === "contracted" && expiry ? new Date(expiry).toISOString() : null,
          notes:            note.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error ?? "Failed to create new bond");
      }

      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to replace vehicle");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-gray-900 border border-gray-700 rounded-lg w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
          <h2 className="text-sm font-semibold text-white">Replace Active Vehicle</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300 text-lg leading-none">×</button>
        </div>

        <div className="px-5 py-4">
          {/* Step indicator */}
          <div className="flex items-center gap-2 mb-5">
            {(["reason", "vehicle", "bond"] as const).map((s, i) => (
              <div key={s} className="flex items-center gap-2">
                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold
                  ${step === s ? "bg-gray-400 text-gray-900" :
                    ["reason", "vehicle", "bond"].indexOf(step) > i ? "bg-green-800 text-green-300" :
                    "bg-gray-800 text-gray-600"}`}
                >
                  {i + 1}
                </div>
                {i < 2 && <div className="w-8 h-px bg-gray-700" />}
              </div>
            ))}
          </div>

          {/* Step: reason */}
          {step === "reason" && (
            <div className="space-y-4">
              <div>
                <p className="text-xs text-gray-500 mb-1">Replacing</p>
                <p className="text-sm font-medium text-white">
                  {activeBond.vehicle.make} {activeBond.vehicle.model}{" "}
                  <span className="font-mono text-gray-300">({activeBond.vehicle.plateNumber})</span>
                </p>
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Reason for replacement *</label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder={`e.g. Relief car — ${activeBond.vehicle.plateNumber} in workshop until 5 Jul 2026`}
                  rows={3}
                  className="w-full bg-gray-800 border border-gray-700 text-white text-sm rounded px-3 py-2 resize-none focus:outline-none focus:border-gray-500"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" className="border-gray-700 text-gray-400" onClick={onClose}>
                  Cancel
                </Button>
                <Button
                  size="sm"
                  className="bg-gray-700 hover:bg-gray-600"
                  disabled={!note.trim()}
                  onClick={() => setStep("vehicle")}
                >
                  Next: Select Vehicle →
                </Button>
              </div>
            </div>
          )}

          {/* Step: vehicle */}
          {step === "vehicle" && (
            <div className="space-y-3">
              <input
                type="text"
                value={search}
                onChange={(e) => { setSearch(e.target.value); doSearch(e.target.value); }}
                placeholder="Search by plate, make, or model…"
                className="w-full bg-gray-800 border border-gray-700 text-white text-sm rounded px-3 py-2 focus:outline-none focus:border-gray-500"
                autoFocus
              />
              <div className="border border-gray-800 rounded overflow-hidden max-h-52 overflow-y-auto">
                {!search.trim() ? (
                  <p className="p-3 text-xs text-gray-600 text-center">Type to search vehicles</p>
                ) : searching ? (
                  <p className="p-3 text-xs text-gray-500 text-center">Searching…</p>
                ) : vehicles.length === 0 ? (
                  <p className="p-3 text-xs text-gray-600 text-center">No vehicles found</p>
                ) : vehicles.map((v) => (
                  <button
                    key={v.id}
                    onClick={() => setSelected(v)}
                    className={`w-full text-left px-3 py-2.5 text-sm border-b border-gray-800 last:border-0
                      hover:bg-gray-800 transition-colors
                      ${selected?.id === v.id ? "bg-gray-700/50" : ""}`}
                  >
                    <span className="font-mono font-semibold text-white">{v.plateNumber}</span>
                    <span className="ml-2 text-gray-400 text-xs">
                      {v.make} {v.model}
                      {v.vehicleClass ? ` · ${VEHICLE_CLASS_LABELS[v.vehicleClass] ?? v.vehicleClass}` : ""}
                    </span>
                    {v.status !== "active" && (
                      <span className="ml-2 text-orange-400 text-xs">({v.status})</span>
                    )}
                  </button>
                ))}
              </div>
              {selected && (
                <p className="text-xs text-green-400">
                  ✓ Selected: {selected.plateNumber} — {selected.make} {selected.model}
                </p>
              )}
              <div className="flex justify-between">
                <Button variant="outline" size="sm" className="border-gray-700 text-gray-400"
                  onClick={() => setStep("reason")}>
                  ← Back
                </Button>
                <Button size="sm" className="bg-gray-700 hover:bg-gray-600"
                  disabled={!selected} onClick={() => setStep("bond")}>
                  Next: Bond Type →
                </Button>
              </div>
            </div>
          )}

          {/* Step: bond type */}
          {step === "bond" && selected && (
            <div className="space-y-4">
              <div>
                <p className="text-xs text-gray-500 mb-1">New vehicle</p>
                <p className="text-sm font-medium text-white">
                  <span className="font-mono">{selected.plateNumber}</span>
                  {" — "}{selected.make} {selected.model}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {(["owned", "contracted"] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => setBondType(type)}
                    className={`p-3 rounded-lg border text-left transition-colors
                      ${bondType === type
                        ? "border-gray-500 bg-gray-700/50"
                        : "border-gray-700 bg-gray-800/40 hover:bg-gray-800"}`}
                  >
                    <div className="text-sm font-semibold text-white">
                      {type === "owned" ? "Owned" : "Rental"}
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {type === "owned" ? "Driver owns this vehicle" : "Rental / relief vehicle"}
                    </div>
                  </button>
                ))}
              </div>

              {bondType === "contracted" && (
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Rental / Agreement Expiry *</label>
                  <input
                    type="date"
                    value={expiry}
                    min={new Date().toISOString().slice(0, 10)}
                    onChange={(e) => setExpiry(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 text-white text-sm rounded px-3 py-2 focus:outline-none focus:border-gray-500"
                  />
                </div>
              )}

              {error && <p className="text-xs text-red-400">{error}</p>}

              <div className="flex justify-between">
                <Button variant="outline" size="sm" className="border-gray-700 text-gray-400"
                  onClick={() => setStep("vehicle")}>
                  ← Back
                </Button>
                <Button
                  size="sm"
                  className="bg-gray-700 hover:bg-gray-600"
                  disabled={loading || (bondType === "contracted" && !expiry)}
                  onClick={handleReplace}
                >
                  {loading ? "Replacing…" : "Confirm Replacement"}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Assign Vehicle Modal (for no-bond state) ─────────────────────────────────

function AssignVehicleModal({
  driverId, onClose, onSuccess,
}: {
  driverId: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [search, setSearch]     = useState("");
  const [vehicles, setVehicles] = useState<VehicleResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<VehicleResult | null>(null);
  const [bondType, setBondType] = useState<"owned" | "contracted">("owned");
  const [expiry, setExpiry]     = useState("");
  const [note, setNote]         = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) { setVehicles([]); return; }
    setSearching(true);
    const res = await fetch(`/api/admin/vehicles?search=${encodeURIComponent(q)}`);
    const data = await res.json();
    setVehicles(Array.isArray(data) ? data : []);
    setSearching(false);
  }, []);

  async function handleAssign() {
    if (!selected) return;
    setLoading(true);
    setError("");
    const res = await fetch("/api/admin/vehicle-assignments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        driverId,
        vehicleId:        selected.id,
        relationshipType: bondType,
        contractExpiry:   bondType === "contracted" && expiry ? new Date(expiry).toISOString() : null,
        notes:            note.trim() || undefined,
      }),
    });
    if (!res.ok) {
      const d = await res.json();
      setError(d.error ?? "Failed to create assignment");
      setLoading(false);
      return;
    }
    onSuccess();
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-gray-900 border border-gray-700 rounded-lg w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
          <h2 className="text-sm font-semibold text-white">Assign Vehicle</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300 text-lg leading-none">×</button>
        </div>
        <div className="px-5 py-4 space-y-4">
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); doSearch(e.target.value); }}
            placeholder="Search by plate, make, or model…"
            className="w-full bg-gray-800 border border-gray-700 text-white text-sm rounded px-3 py-2 focus:outline-none focus:border-gray-500"
            autoFocus
          />
          <div className="border border-gray-800 rounded overflow-hidden max-h-44 overflow-y-auto">
            {!search.trim() ? (
              <p className="p-3 text-xs text-gray-600 text-center">Type to search vehicles</p>
            ) : searching ? (
              <p className="p-3 text-xs text-gray-500 text-center">Searching…</p>
            ) : vehicles.length === 0 ? (
              <p className="p-3 text-xs text-gray-600 text-center">No vehicles found</p>
            ) : vehicles.map((v) => (
              <button
                key={v.id}
                onClick={() => setSelected(v)}
                className={`w-full text-left px-3 py-2.5 text-sm border-b border-gray-800 last:border-0
                  hover:bg-gray-800 transition-colors ${selected?.id === v.id ? "bg-gray-700/50" : ""}`}
              >
                <span className="font-mono font-semibold text-white">{v.plateNumber}</span>
                <span className="ml-2 text-gray-400 text-xs">
                  {v.make} {v.model}
                  {v.vehicleClass ? ` · ${VEHICLE_CLASS_LABELS[v.vehicleClass] ?? v.vehicleClass}` : ""}
                </span>
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3">
            {(["owned", "contracted"] as const).map((type) => (
              <button
                key={type}
                onClick={() => setBondType(type)}
                className={`p-3 rounded-lg border text-left transition-colors
                  ${bondType === type ? "border-gray-500 bg-gray-700/50" : "border-gray-700 bg-gray-800/40 hover:bg-gray-800"}`}
              >
                <div className="text-sm font-semibold text-white">
                  {type === "owned" ? "Owned" : "Rental"}
                </div>
                <div className="text-xs text-gray-500 mt-0.5">
                  {type === "owned" ? "Driver owns this vehicle" : "Rental / relief vehicle"}
                </div>
              </button>
            ))}
          </div>

          {bondType === "contracted" && (
            <div>
              <label className="text-xs text-gray-400 block mb-1">Rental expiry *</label>
              <input
                type="date"
                value={expiry}
                min={new Date().toISOString().slice(0, 10)}
                onChange={(e) => setExpiry(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 text-white text-sm rounded px-3 py-2"
              />
            </div>
          )}

          <div>
            <label className="text-xs text-gray-400 block mb-1">Notes (optional)</label>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Verified via physical inspection"
              className="w-full bg-gray-800 border border-gray-700 text-white text-sm rounded px-3 py-2"
            />
          </div>

          {error && <p className="text-xs text-red-400">{error}</p>}

          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" className="border-gray-700 text-gray-400" onClick={onClose}>
              Cancel
            </Button>
            <Button
              size="sm"
              className="bg-gray-700 hover:bg-gray-600"
              disabled={loading || !selected || (bondType === "contracted" && !expiry)}
              onClick={handleAssign}
            >
              {loading ? "Assigning…" : "Confirm Assignment"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
