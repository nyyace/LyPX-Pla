"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

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
  availableDriverIds?: string[];  // for vehicle view, not used directly here
}

interface RowState {
  loading:   boolean;
  error:     string | null;
  editExpiry: boolean;
  newExpiry:  string;
  editNotes:  boolean;
  newNotes:   string;
}

const VEHICLE_CLASS_LABELS: Record<string, string> = {
  standard_sedan:           "Standard Sedan",
  standard_mpv_nve:         "Standard MPV (NVE)",
  executive_sedan_eclass:   "Executive Sedan (E-Class)",
  luxury_sedan_sclass:      "Luxury Sedan (S-Class)",
  executive_mpv_avf:        "Executive MPV (AVF)",
  prestige_mpv_lexus:       "Prestige MPV (Lexus)",
  luxury_executive_van_vvv: "Luxury Executive Van (VVV)",
  group_van_combi:          "Group Van (Combi)",
  prestige_collection:      "Prestige Collection (Rolls Royce, MayBach)",
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
  const [showAdd, setShowAdd]           = useState(false);
  const [addLoading, setAddLoading]     = useState(false);
  const [addError, setAddError]         = useState<string | null>(null);
  const [addForm, setAddForm]           = useState({
    linkedId:         "",   // vehicleId (if entityType=driver) or driverId (if entityType=vehicle)
    relationshipType: "owned" as "owned" | "contracted",
    contractExpiry:   "",
    notes:            "",
  });

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
    if (!addForm.linkedId.trim()) {
      setAddError(entityType === "driver" ? "Vehicle ID is required" : "Driver ID is required");
      return;
    }
    setAddLoading(true);
    setAddError(null);

    const body = entityType === "driver"
      ? {
          driverId:        entityId,
          vehicleId:       addForm.linkedId.trim(),
          relationshipType: addForm.relationshipType,
          contractStatus:  addForm.relationshipType === "contracted" ? "active" : undefined,
          contractExpiry:  addForm.contractExpiry ? new Date(addForm.contractExpiry).toISOString() : null,
          notes:           addForm.notes.trim() || undefined,
        }
      : {
          driverId:        addForm.linkedId.trim(),
          vehicleId:       entityId,
          relationshipType: addForm.relationshipType,
          contractStatus:  addForm.relationshipType === "contracted" ? "active" : undefined,
          contractExpiry:  addForm.contractExpiry ? new Date(addForm.contractExpiry).toISOString() : null,
          notes:           addForm.notes.trim() || undefined,
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
      setShowAdd(false);
      setAddForm({ linkedId: "", relationshipType: "owned", contractExpiry: "", notes: "" });
      router.refresh();
    }
    setAddLoading(false);
  }

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
            <div>
              <label className="text-xs text-gray-500 block mb-1">
                {entityType === "driver" ? "Vehicle ID" : "Driver ID"}
              </label>
              <input
                value={addForm.linkedId}
                onChange={(e) => setAddForm({ ...addForm, linkedId: e.target.value })}
                placeholder={entityType === "driver" ? "cmc... (vehicle CUID)" : "cmc... (driver CUID)"}
                className="w-full bg-gray-800 border border-gray-700 text-white text-xs rounded px-2 py-1.5 font-mono"
              />
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
                onClick={() => setShowAdd(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {assignments.length === 0 && !showAdd && (
          <p className="text-sm text-gray-600 py-2">No vehicle assignments.</p>
        )}

        {assignments.map((a) => {
          const s = rowStates[a.id];
          const isTerminated = !!a.terminatedAt;

          return (
            <div
              key={a.id}
              className={`border rounded-md p-3 space-y-2 ${isTerminated ? "border-gray-800 opacity-60" : "border-gray-700"}`}
            >
              {/* Top row: entity name + class + status */}
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
                      : `Vehicle: `}
                    {entityType === "vehicle" && (
                      <Link href={`/vehicles/${a.vehicleId}`} className="text-gray-400 font-mono hover:underline">
                        {a.vehiclePlate}
                      </Link>
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

              {/* Details row */}
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
