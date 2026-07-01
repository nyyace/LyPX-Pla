"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const STATUS_OPTIONS = [
  { value: "pending",       label: "Pending" },
  { value: "active",        label: "Active" },
  { value: "expiring_soon", label: "Expiring Soon" },
  { value: "suspended",     label: "Suspended" },
];

const STATUS_BADGE: Record<string, string> = {
  active:        "border-green-700  text-green-300",
  expiring_soon: "border-yellow-700 text-yellow-300",
  suspended:     "border-red-700    text-red-300",
  pending:       "border-gray-700   text-gray-400",
};

interface Props {
  driverId:           string;
  firstName:          string;
  lastName:           string;
  phoneNumber:        string;
  licenseNumber:      string | null;
  licenseIssuedDate:  string | null; // ISO
  complianceStatus:   string;
  statusOverriddenAt: string | null; // ISO
  tier2Qualified:     boolean;
}

function isoToDateInput(iso: string | null): string {
  if (!iso) return "";
  return iso.slice(0, 10);
}

function yearsMonths(dateStr: string): string {
  if (!dateStr) return "";
  const issued = new Date(dateStr);
  const now = new Date();
  let years = now.getFullYear() - issued.getFullYear();
  let months = now.getMonth() - issued.getMonth();
  if (months < 0) { years--; months += 12; }
  return `${years}y ${months}m experience`;
}

export function DriverProfileEditor({
  driverId, firstName, lastName, phoneNumber,
  licenseNumber, licenseIssuedDate, complianceStatus, statusOverriddenAt, tier2Qualified,
}: Props) {
  const router = useRouter();

  const [form, setForm] = useState({
    firstName,
    lastName,
    phoneNumber,
    licenseNumber: licenseNumber ?? "",
    licenseIssuedDate: isoToDateInput(licenseIssuedDate),
    complianceStatus,
    tier2Qualified,
    statusOverrideReason: "",
  });

  const [loading, setLoading] = useState(false);
  const [clearingOverride, setClearingOverride] = useState(false);
  const [error, setError]   = useState<string | null>(null);
  const [saved, setSaved]   = useState(false);

  const statusChanged = form.complianceStatus !== complianceStatus;

  async function handleSave() {
    setLoading(true);
    setError(null);
    setSaved(false);

    const body: Record<string, unknown> = {
      firstName:         form.firstName.trim(),
      lastName:          form.lastName.trim(),
      phoneNumber:       form.phoneNumber.trim(),
      licenseNumber:     form.licenseNumber.trim() || null,
      licenseIssuedDate: form.licenseIssuedDate ? new Date(form.licenseIssuedDate).toISOString() : null,
      tier2Qualified:    form.tier2Qualified,
    };
    // Only include complianceStatus if the admin explicitly changed it
    if (statusChanged) {
      body.complianceStatus       = form.complianceStatus;
      body.statusOverrideReason   = form.statusOverrideReason.trim() || undefined;
    }

    const res = await fetch(`/api/admin/drivers/${driverId}`, {
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
    const res = await fetch(`/api/admin/drivers/${driverId}`, {
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
        <CardTitle className="text-sm text-gray-300">Profile</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-gray-500 block mb-1">First name</label>
            <input
              value={form.firstName}
              onChange={(e) => setForm({ ...form, firstName: e.target.value })}
              className="w-full bg-gray-800 border border-gray-700 text-white text-sm rounded px-3 py-1.5"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Last name</label>
            <input
              value={form.lastName}
              onChange={(e) => setForm({ ...form, lastName: e.target.value })}
              className="w-full bg-gray-800 border border-gray-700 text-white text-sm rounded px-3 py-1.5"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Phone</label>
            <input
              value={form.phoneNumber}
              onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })}
              className="w-full bg-gray-800 border border-gray-700 text-white text-sm rounded px-3 py-1.5 font-mono"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Licence number</label>
            <input
              value={form.licenseNumber}
              onChange={(e) => setForm({ ...form, licenseNumber: e.target.value })}
              className="w-full bg-gray-800 border border-gray-700 text-white text-sm rounded px-3 py-1.5 font-mono"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">
              Licence issued date
              {form.licenseIssuedDate && (
                <span className="ml-2 text-gray-600">({yearsMonths(form.licenseIssuedDate)})</span>
              )}
            </label>
            <input
              type="date"
              value={form.licenseIssuedDate}
              onChange={(e) => setForm({ ...form, licenseIssuedDate: e.target.value })}
              className="w-full bg-gray-800 border border-gray-700 text-white text-sm rounded px-3 py-1.5"
            />
          </div>
          <div className="flex items-end gap-2">
            <label className="text-xs text-gray-500 block mb-1 flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.tier2Qualified}
                onChange={(e) => setForm({ ...form, tier2Qualified: e.target.checked })}
                className="rounded"
              />
              LyPX Central Pool eligible
            </label>
          </div>
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
            <Badge variant="outline" className={`text-xs ${STATUS_BADGE[form.complianceStatus]}`}>
              {form.complianceStatus.replace("_", " ")}
            </Badge>
            <select
              value={form.complianceStatus}
              onChange={(e) => setForm({ ...form, complianceStatus: e.target.value })}
              className="bg-gray-800 border border-gray-700 text-white text-sm rounded px-2 py-1"
            >
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          {statusChanged && (
            <div className="mt-2">
              <label className="text-xs text-gray-500 block mb-1">Reason for override</label>
              <input
                value={form.statusOverrideReason}
                onChange={(e) => setForm({ ...form, statusOverrideReason: e.target.value })}
                placeholder="e.g. Manual exception approved by ops manager"
                className="w-full bg-gray-800 border border-gray-700 text-white text-sm rounded px-3 py-1.5"
              />
            </div>
          )}
        </div>

        {error && <p className="text-xs text-red-400">{error}</p>}
        {saved && <p className="text-xs text-green-400">Saved.</p>}

        <Button
          size="sm"
          disabled={loading}
          onClick={handleSave}
          className="bg-gray-700 hover:bg-gray-600"
        >
          {loading ? "Saving…" : "Save profile"}
        </Button>
      </CardContent>
    </Card>
  );
}
