"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { VEHICLE_CLASS_LABELS } from "@/lib/constants/vehicleClasses";

export interface AssignmentRow {
  id:              string;
  driverId:        string;
  driverName:      string;
  vehicleId:       string;
  vehiclePlate:    string;
  vehicleMake:     string;
  vehicleModel:    string;
  vehicleClass:    string | null;
  relationshipType: string;
  contractStatus:  string | null;
  contractExpiry:  string | null; // ISO
  verifiedAt:      string | null; // ISO
  terminatedAt:    string | null; // ISO
  notes:           string | null;
}

interface Props {
  assignments:    AssignmentRow[];
  entityType:     "driver" | "vehicle";
  entityId:       string;
}

interface RowState {
  loading:    boolean;
  error:      string | null;
  editExpiry: boolean;
  newExpiry:  string;
  editNotes:  boolean;
  newNotes:   string;
}

interface DriverResult {
  id:               string;
  firstName:        string;
  lastName:         string;
  phoneNumber:      string;
  complianceStatus: string;
}

interface VehicleResult {
  id:           string;
  plateNumber:  string;
  make:         string;
  model:        string;
  vehicleClass: string | null;
  status:       string;
}


const COMPLIANCE_COLORS: Record<string, string> = {
  active:        "text-green-400",
  expiring_soon: "text-yellow-400",
  suspended:     "text-red-400",
  pending:       "text-gray-500",
};

function isoToDateInput(iso: string | null): string {
  if (!iso) return "";
  return iso.slice(0, 10);
}

export function VehicleAssignmentsPanel({ assignments, entityType, entityId }: Props) {
  const router = useRouter();

  const [rowStates, setRowStates] = useState<Record<string, RowState>>(() =>
    Object.fromEntries(
      assignments.map((a) => [
        a.id,
        {
          loading:    false,
          error:      null,
          editExpiry: false,
          newExpiry:  isoToDateInput(a.contractExpiry),
          editNotes:  false,
          newNotes:   a.notes ?? "",
        },
      ])
    )
  );

  // Add-assignment form
  const [showAdd, setShowAdd]       = useState(false);
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError]     = useState<string | null>(null);
  const [addForm, setAddForm]       = useState({
    relationshipType: "owned" as "owned" | "contracted",
    contractExpiry:   "",
    notes:            "",
  });

  // Live search state (replaces raw ID input)
  const [searchQuery, setSearchQuery]             = useState("");
  const [driverResults, setDriverResults]         = useState<DriverResult[]>([]);
  const [vehicleResults, setVehicleResults]       = useState<VehicleResult[]>([]);
  const [selectedDriver, setSelectedDriver]       = useState<DriverResult | null>(null);
  const [selectedVehicle, setSelectedVehicle]     = useState<VehicleResult | null>(null);
  const [searchLoading, setSearchLoading]         = useState(false);

  // Debounced search — driver when on vehicle page, vehicle when on driver page
  useEffect(() => {
    const q = searchQuery.trim();
    if (q.length < 2) {
      setDriverResults([]);
      setVehicleResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const endpoint = entityType === "vehicle"
          ? `/api/admin/drivers?search=${encodeURIComponent(q)}`
          : `/api/admin/vehicles?search=${encodeURIComponent(q)}`;
        const res = await fetch(endpoint);
        const data = await res.json();
        if (entityType === "vehicle") {
          setDriverResults(Array.isArray(data) ? data : []);
        } else {
          setVehicleResults(Array.isArray(data) ? data : []);
        }
      } catch {
        // silent
      } finally {
        setSearchLoading(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, entityType]);

  function resetAddForm() {
    setShowAdd(false);
    setAddError(null);
    setSearchQuery("");
    setDriverResults([]);
    setVehicleResults([]);
    setSelectedDriver(null);
    setSelectedVehicle(null);
    setAddForm({ relationshipType: "owned", contractExpiry: "", notes: "" });
  }

  function patchRow(id: string, update: Partial<RowState>) {
    setRowStates((prev) => ({ ...prev, [id]: { ...prev[id], ...update } }));
  }

  async function doAction(assignmentId: string, action: string, extra?: Record<string, unknown>) {
    patchRow(assignmentId, { loading: true, error: null });
    const res = await fetch(`/api/admin/vehicle-assignments/${assignmentId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...extra }),
    });
    const data = await res.json();
    if (!res.ok) {
      patchRow(assignmentId, { loading: false, error: data.error ?? "Action failed" });
      return;
    }
    patchRow(assignmentId, { loading: false, editExpiry: false, editNotes: false });
    router.refresh();
  }

  async function handleAddAssignment() {
    const linkedId = entityType === "vehicle"
      ? selectedDriver?.id
      : selectedVehicle?.id;

    if (!linkedId) {
      setAddError(entityType === "vehicle" ? "Please select a driver" : "Please select a vehicle");
      return;
    }

    setAddLoading(true);
    setAddError(null);

    const body = entityType === "driver"
      ? {
          driverId:         entityId,
          vehicleId:        linkedId,
          relationshipType: addForm.relationshipType,
          contractStatus:   addForm.relationshipType === "contracted" ? "active" : undefined,
          contractExpiry:   addForm.contractExpiry ? new Date(addForm.contractExpiry).toISOString() : null,
          notes:            addForm.notes.trim() || undefined,
        }
      : {
          driverId:         linkedId,
          vehicleId:        entityId,
          relationshipType: addForm.relationshipType,
          contractStatus:   addForm.relationshipType === "contracted" ? "active" : undefined,
          contractExpiry:   addForm.contractExpiry ? new Date(addForm.contractExpiry).toISOString() : null,
          notes:            addForm.notes.trim() || undefined,
        };

    const res = await fetch("/api/admin/vehicle-assignments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) {
      setAddError(data.error ?? "Failed to create assignment");
    } else {
      resetAddForm();
      router.refresh();
    }
    setAddLoading(false);
  }

  // ── Add-form search field ────────────────────────────────────────────────────

  function renderSearchField() {
    const isDriverSearch = entityType === "vehicle";
    const selected       = isDriverSearch ? selectedDriver : selectedVehicle;
    const results        = isDriverSearch ? driverResults  : vehicleResults;
    const label          = isDriverSearch ? "Driver" : "Vehicle";
    const placeholder    = isDriverSearch
      ? "Search by name or phone…"
      : "Search by plate, make, or model…";

    function clearSelection() {
      if (isDriverSearch) setSelectedDriver(null);
      else setSelectedVehicle(null);
      setSearchQuery("");
      setDriverResults([]);
      setVehicleResults([]);
    }

    if (selected) {
      // Selected state — show name/plate + Change button
      return (
        <div className="flex items-center justify-between p-2.5 bg-gray-800 border border-green-900/60 rounded">
          <div>
            {isDriverSearch && selectedDriver ? (
              <>
                <p className="text-xs font-semibold text-white">
                  {selectedDriver.firstName} {selectedDriver.lastName}
                </p>
                <p className={`text-xs mt-0.5 ${COMPLIANCE_COLORS[selectedDriver.complianceStatus] ?? "text-gray-500"}`}>
                  {selectedDriver.complianceStatus.replace("_", " ")}
                </p>
              </>
            ) : selectedVehicle ? (
              <>
                <p className="text-xs font-semibold font-mono text-white">{selectedVehicle.plateNumber}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {selectedVehicle.make} {selectedVehicle.model}
                  {selectedVehicle.vehicleClass
                    ? ` · ${VEHICLE_CLASS_LABELS[selectedVehicle.vehicleClass] ?? selectedVehicle.vehicleClass}`
                    : ""}
                </p>
              </>
            ) : null}
          </div>
          <button
            type="button"
            onClick={clearSelection}
            className="text-xs text-gray-500 hover:text-red-400 transition-colors ml-3 shrink-0"
          >
            Change
          </button>
        </div>
      );
    }

    // Search input + dropdown
    return (
      <div className="relative">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={placeholder}
          className="w-full bg-gray-800 border border-gray-700 text-white text-xs rounded px-2 py-1.5 focus:outline-none focus:border-gray-500"
          autoComplete="off"
        />
        {searchQuery.length === 1 && (
          <p className="text-xs text-gray-600 mt-1">Type at least 2 characters to search</p>
        )}
        {searchQuery.length >= 2 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-gray-800 border border-gray-700 rounded shadow-lg z-20 max-h-48 overflow-y-auto">
            {searchLoading ? (
              <p className="px-3 py-2 text-xs text-gray-500">Searching…</p>
            ) : results.length === 0 ? (
              <p className="px-3 py-2 text-xs text-gray-600">No {label.toLowerCase()}s found</p>
            ) : isDriverSearch ? (
              (results as DriverResult[]).map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => {
                    setSelectedDriver(d);
                    setSearchQuery("");
                    setDriverResults([]);
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-gray-700 border-b border-gray-700 last:border-0 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-white">
                        {d.firstName} {d.lastName}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">{d.phoneNumber}</p>
                    </div>
                    <span className={`text-xs ${COMPLIANCE_COLORS[d.complianceStatus] ?? "text-gray-500"}`}>
                      {d.complianceStatus.replace("_", " ")}
                    </span>
                  </div>
                </button>
              ))
            ) : (
              (results as VehicleResult[]).map((v) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => {
                    setSelectedVehicle(v);
                    setSearchQuery("");
                    setVehicleResults([]);
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-gray-700 border-b border-gray-700 last:border-0 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-mono font-semibold text-white">{v.plateNumber}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {v.make} {v.model}
                        {v.vehicleClass ? ` · ${VEHICLE_CLASS_LABELS[v.vehicleClass] ?? v.vehicleClass}` : ""}
                      </p>
                    </div>
                    {v.status !== "active" && (
                      <span className="text-xs text-orange-400">({v.status})</span>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        )}
      </div>
    );
  }

  // ────────────────────────────────────────────────────────────────────────────

  return (
    <Card className="bg-gray-900 border-gray-800">
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <CardTitle className="text-sm text-gray-300">
          {entityType === "driver" ? "Vehicle Assignments" : "Driver Assignments"}
        </CardTitle>
        <Button
          size="sm"
          variant="outline"
          className="border-gray-700 text-gray-300 text-xs h-7"
          onClick={() => setShowAdd(!showAdd)}
        >
          + Add
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">

        {/* Add assignment form */}
        {showAdd && (
          <div className="border border-gray-700 rounded-md p-3 space-y-3 bg-gray-800/40">
            <p className="text-xs text-gray-400 font-medium">New Assignment</p>

            {/* Live search field */}
            <div>
              <label className="text-xs text-gray-500 block mb-1">
                {entityType === "vehicle" ? "Driver *" : "Vehicle *"}
              </label>
              {renderSearchField()}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500 block mb-1">Relationship</label>
                <select
                  value={addForm.relationshipType}
                  onChange={(e) => setAddForm({ ...addForm, relationshipType: e.target.value as "owned" | "contracted" })}
                  className="w-full bg-gray-800 border border-gray-700 text-white text-xs rounded px-2 py-1.5"
                >
                  <option value="owned">Owned</option>
                  <option value="contracted">Contracted / Rental</option>
                </select>
              </div>
              {addForm.relationshipType === "contracted" && (
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Contract expiry</label>
                  <input
                    type="date"
                    value={addForm.contractExpiry}
                    onChange={(e) => setAddForm({ ...addForm, contractExpiry: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-700 text-white text-xs rounded px-2 py-1.5"
                  />
                </div>
              )}
            </div>

            <div>
              <label className="text-xs text-gray-500 block mb-1">Notes (optional)</label>
              <input
                value={addForm.notes}
                onChange={(e) => setAddForm({ ...addForm, notes: e.target.value })}
                placeholder="e.g. Verified via physical inspection"
                className="w-full bg-gray-800 border border-gray-700 text-white text-xs rounded px-2 py-1.5"
              />
            </div>

            {addError && <p className="text-xs text-red-400">{addError}</p>}

            <div className="flex gap-2">
              <Button
                size="sm"
                className="h-7 text-xs bg-gray-700 hover:bg-gray-600"
                disabled={addLoading}
                onClick={handleAddAssignment}
              >
                {addLoading ? "Creating…" : "Create assignment"}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-xs text-gray-400"
                onClick={resetAddForm}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {assignments.length === 0 && !showAdd && (
          <p className="text-sm text-gray-600 py-2">No assignments.</p>
        )}

        {assignments.map((a) => {
          const s            = rowStates[a.id];
          const isTerminated = !!a.terminatedAt;

          return (
            <div
              key={a.id}
              className={`border rounded-md p-3 space-y-2 ${isTerminated ? "border-gray-800 opacity-60" : "border-gray-700"}`}
            >
              {/* Top row: name/plate + badges */}
              <div className="flex items-start justify-between gap-2">
                <div>
                  {entityType === "driver" ? (
                    <Link href={`/vehicles/${a.vehicleId}`} className="text-sm text-white hover:underline font-mono">
                      {a.vehiclePlate}
                    </Link>
                  ) : (
                    <Link href={`/drivers/${a.driverId}`} className="text-sm text-white hover:underline">
                      {a.driverName}
                    </Link>
                  )}
                  <p className="text-xs text-gray-500 mt-0.5">
                    {entityType === "driver"
                      ? `${a.vehicleMake} ${a.vehicleModel}${a.vehicleClass ? ` · ${VEHICLE_CLASS_LABELS[a.vehicleClass] ?? a.vehicleClass}` : ""}`
                      : (
                          <>
                            {"Vehicle: "}
                            <Link href={`/vehicles/${a.vehicleId}`} className="text-gray-400 font-mono hover:underline">
                              {a.vehiclePlate}
                            </Link>
                          </>
                        )}
                  </p>
                </div>
                <div className="flex flex-wrap gap-1 justify-end">
                  <Badge variant="outline" className="text-xs border-gray-700 text-gray-400">
                    {a.relationshipType}
                  </Badge>
                  {a.contractStatus && (
                    <Badge
                      variant="outline"
                      className={`text-xs ${
                        a.contractStatus === "active"
                          ? "border-green-800 text-green-400"
                          : a.contractStatus === "terminated"
                          ? "border-red-900 text-red-400"
                          : "border-gray-700 text-gray-500"
                      }`}
                    >
                      {a.contractStatus}
                    </Badge>
                  )}
                  {a.verifiedAt && !isTerminated && (
                    <Badge variant="outline" className="text-xs border-blue-900 text-blue-400">
                      verified
                    </Badge>
                  )}
                </div>
              </div>

              {/* Details */}
              <div className="text-xs text-gray-500 space-y-0.5">
                {a.contractExpiry && (
                  <p>Contract expiry: <span className="text-gray-400">{isoToDateInput(a.contractExpiry)}</span></p>
                )}
                {a.verifiedAt && (
                  <p>Verified: <span className="text-gray-400">{isoToDateInput(a.verifiedAt)}</span></p>
                )}
                {a.terminatedAt && (
                  <p className="text-red-500">Terminated: {isoToDateInput(a.terminatedAt)}</p>
                )}
                {a.notes && <p>Notes: <span className="text-gray-400">{a.notes}</span></p>}
              </div>

              {s.error && <p className="text-xs text-red-400">{s.error}</p>}

              {/* Actions */}
              {!isTerminated && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {!a.verifiedAt && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs border-blue-800 text-blue-400 hover:bg-blue-950"
                      disabled={s.loading}
                      onClick={() => doAction(a.id, "verify")}
                    >
                      {s.loading ? "…" : "Verify"}
                    </Button>
                  )}

                  {a.relationshipType === "contracted" && (
                    s.editExpiry ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="date"
                          value={s.newExpiry}
                          onChange={(e) => patchRow(a.id, { newExpiry: e.target.value })}
                          className="bg-gray-800 border border-gray-700 text-white text-xs rounded px-2 py-1"
                        />
                        <Button
                          size="sm"
                          className="h-7 text-xs bg-gray-700 hover:bg-gray-600"
                          disabled={s.loading}
                          onClick={() =>
                            doAction(a.id, "update_expiry", {
                              contractExpiry: s.newExpiry ? new Date(s.newExpiry).toISOString() : null,
                            })
                          }
                        >
                          Save
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs text-gray-400"
                          onClick={() => patchRow(a.id, { editExpiry: false })}
                        >
                          ×
                        </Button>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs border-gray-700 text-gray-300"
                        onClick={() => patchRow(a.id, { editExpiry: true })}
                      >
                        Update expiry
                      </Button>
                    )
                  )}

                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs border-red-900 text-red-400 hover:bg-red-950"
                    disabled={s.loading}
                    onClick={() => {
                      if (confirm("Terminate this assignment? This cannot be undone.")) {
                        doAction(a.id, "terminate");
                      }
                    }}
                  >
                    Terminate
                  </Button>
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
