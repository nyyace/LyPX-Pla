"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const VEHICLE_CLASS_OPTIONS = [
  { value: "standard_sedan",           label: "Standard Sedan" },
  { value: "standard_mpv_nve",         label: "Standard MPV (NVE)" },
  { value: "executive_sedan_eclass",   label: "Executive Sedan (E-Class)" },
  { value: "luxury_sedan_sclass",      label: "Luxury Sedan (S-Class)" },
  { value: "executive_mpv_avf",        label: "Executive MPV (AVF)" },
  { value: "prestige_mpv_lexus",       label: "Prestige MPV (Lexus)" },
  { value: "luxury_executive_van_vvv", label: "Luxury Executive Van (VVV)" },
  { value: "group_van_combi",          label: "Group Van (Combi)" },
  { value: "prestige_collection",      label: "Prestige Collection (Rolls Royce, MayBach)" },
];

interface Props {
  vehicleId:        string;
  make:             string;
  model:            string;
  year:             number | null;
  colour:           string | null;
  vehicleClass:     string | null;
  seatingCapacity:  number | null;
  insuranceCompany: string | null;
}

export function VehicleProfileEditor({
  vehicleId, make, model, year, colour, vehicleClass, seatingCapacity, insuranceCompany,
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
  });

  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const [saved, setSaved]     = useState(false);

  async function handleSave() {
    setLoading(true);
    setError(null);
    setSaved(false);

    const res = await fetch(`/api/admin/vehicles/${vehicleId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        make:             form.make.trim() || undefined,
        model:            form.model.trim() || undefined,
        year:             form.year ? parseInt(form.year, 10) : null,
        colour:           form.colour.trim() || null,
        vehicleClass:     form.vehicleClass || null,
        seatingCapacity:  form.seatingCapacity ? parseInt(form.seatingCapacity, 10) : null,
        insuranceCompany: form.insuranceCompany.trim() || null,
      }),
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
            {VEHICLE_CLASS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
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
