"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { VEHICLE_CLASSES } from "@/lib/constants/vehicleClasses";

const VEHICLE_STATUS_OPTIONS = [
  { value: "active",    label: "Active" },
  { value: "inactive",  label: "Inactive" },
  { value: "suspended", label: "Suspended" },
];

const STATUS_BADGE: Record<string, string> = {
  active:    "border-green-700 text-green-300",
  inactive:  "border-gray-700  text-gray-400",
  suspended: "border-red-700   text-red-300",
};

interface Props {
  vehicleId:          string;
  make:               string;
  model:              string;
  year:               number | null;
  colour:             string | null;
  vehicleClass:       string | null;
  seatingCapacity:    number | null;
  insuranceCompany:   string | null;
  currentStatus:      string;
  statusOverriddenAt: string | null;
}

export function VehicleProfileEditor({
  vehicleId, make, model, year, colour, vehicleClass, seatingCapacity, insuranceCompany,
  currentStatus, statusOverriddenAt,
}: Props) {
  const router = useRouter();

  const [form, setForm] = useState({
    make,
    model,
    year:             year?.toString() ?? "",
    colour:           colour ?? "",
    vehicleClass:     vehicleClass ?? "",
    seatingCapacity:  seatingCapacity?.toString() ?? "",
    insuranceCompany: insuranceCompany ?? "",
    status:           currentStatus,
  });

  const [loading, setLoading]           = useState(false);
  const [clearingOverride, setClearingOverride] = useState(false);
  const [error, setError]               = useState<string | null>(null);
  const [saved, setSaved]               = useState(false);

  const statusChanged = form.status !== currentStatus;

  async function handleSave() {
    setLoading(true);
    setError(null);
    setSaved(false);

    const body: Record<string, unknown> = {
      make:             form.make.trim() || undefined,
      model:            form.model.trim() || undefined,
      year:             form.year ? parseInt(form.year, 10) : null,
      colour:           form.colour.trim() || null,
      vehicleClass:     form.vehicleClass || null,
      seatingCapacity:  form.seatingCapacity ? parseInt(form.seatingCapacity, 10) : null,
      insuranceCompany: form.insuranceCompany.trim() || null,
    };
    if (statusChanged) {
      body.status = form.status;
    }

    const res = await fetch(`/api/admin/vehicles/${vehicleId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Save failed");
    } else {
      setSaved(true);
      router.refresh();
    }
    setLoading(false);
  }

  async function handleClearOverride() {
    setClearingOverride(true);
    setError(null);
    const res = await fetch(`/api/admin/vehicles/${vehicleId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clearStatusOverride: true }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Failed to clear override");
    } else {
      router.refresh();
    }
    setClearingOverride(false);
  }

  return (
    <Card className="bg-gray-900 border-gray-800">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm text-gray-300">Vehicle Details</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-gray-500 block mb-1">Make</label>
            <input
              value={form.make}
              onChange={(e) => setForm({ ...form, make: e.target.value })}
              className="w-full bg-gray-800 border border-gray-700 text-white text-sm rounded px-3 py-1.5"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Model</label>
            <input
              value={form.model}
              onChange={(e) => setForm({ ...form, model: e.target.value })}
              className="w-full bg-gray-800 border border-gray-700 text-white text-sm rounded px-3 py-1.5"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Year</label>
            <input
              type="number"
              value={form.year}
              onChange={(e) => setForm({ ...form, year: e.target.value })}
              placeholder="e.g. 2022"
              className="w-full bg-gray-800 border border-gray-700 text-white text-sm rounded px-3 py-1.5"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Colour</label>
            <input
              value={form.colour}
              onChange={(e) => setForm({ ...form, colour: e.target.value })}
              placeholder="e.g. Pearl White"
              className="w-full bg-gray-800 border border-gray-700 text-white text-sm rounded px-3 py-1.5"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Seating capacity</label>
            <input
              type="number"
              value={form.seatingCapacity}
              onChange={(e) => setForm({ ...form, seatingCapacity: e.target.value })}
              placeholder="e.g. 7"
              className="w-full bg-gray-800 border border-gray-700 text-white text-sm rounded px-3 py-1.5"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Insurance company</label>
            <input
              value={form.insuranceCompany}
              onChange={(e) => setForm({ ...form, insuranceCompany: e.target.value })}
              placeholder="e.g. NTUC Income"
              className="w-full bg-gray-800 border border-gray-700 text-white text-sm rounded px-3 py-1.5"
            />
          </div>
        </div>

        <div>
          <label className="text-xs text-gray-500 block mb-1">
            Vehicle class
            {!form.vehicleClass && (
              <span className="ml-2 text-orange-500">⚠ Must be set before jobs can be assigned</span>
            )}
          </label>
          <select
            value={form.vehicleClass}
            onChange={(e) => setForm({ ...form, vehicleClass: e.target.value })}
            className="w-full bg-gray-800 border border-gray-700 text-white text-sm rounded px-3 py-1.5"
          >
            <option value="">— Select class —</option>
            {VEHICLE_CLASSES.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        {/* Compliance status override */}
        <div className="border-t border-gray-800 pt-4">
          {statusOverriddenAt && (
            <div className="mb-3 flex items-center justify-between gap-2 rounded border border-orange-800/60 bg-orange-950/30 px-3 py-2">
              <div>
                <p className="text-xs font-medium text-orange-400">Manual override active</p>
                <p className="text-xs text-orange-600">
                  Set on {new Date(statusOverriddenAt).toLocaleDateString("en-SG")} — auto-sync is disabled
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs border-orange-800 text-orange-400 hover:bg-orange-950 shrink-0"
                disabled={clearingOverride}
                onClick={handleClearOverride}
              >
                {clearingOverride ? "Clearing…" : "Clear Override"}
              </Button>
            </div>
          )}
          <p className="text-xs text-gray-500 mb-2">
            Compliance status override{" "}
            <span className="text-gray-600">(normally auto-derived — use only for manual correction)</span>
          </p>
          <div className="flex items-center gap-3 flex-wrap">
            <Badge variant="outline" className={`text-xs ${STATUS_BADGE[form.status] ?? STATUS_BADGE.inactive}`}>
              {form.status}
            </Badge>
            <select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
              className="bg-gray-800 border border-gray-700 text-white text-sm rounded px-2 py-1"
            >
              {VEHICLE_STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        </div>

        {error && <p className="text-xs text-red-400">{error}</p>}
        {saved && <p className="text-xs text-green-400">Saved.</p>}

        <Button
          size="sm"
          disabled={loading}
          onClick={handleSave}
          className="bg-gray-700 hover:bg-gray-600"
        >
          {loading ? "Saving…" : "Save vehicle details"}
        </Button>
      </CardContent>
    </Card>
  );
}
