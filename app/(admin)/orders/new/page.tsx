"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { PhoneInput } from "@/components/ui/PhoneInput";

const SERVICE_TYPES = [
  { value: "p2p",              label: "Point to Point" },
  { value: "departure",        label: "Airport Departure" },
  { value: "arrival_mng",      label: "Airport Arrival — Meet & Greet" },
  { value: "arrival_driveway", label: "Airport Arrival — Driveway" },
  { value: "disposal",         label: "Disposal" },
  { value: "flexible",         label: "Flexible / As Directed" },
];

// dropoff required for all except disposal (which has no fixed endpoint)
const NEEDS_DROPOFF = new Set(["p2p", "departure", "arrival_mng", "arrival_driveway", "flexible"]);
// flight number shown for all airport types (optional)
const SHOWS_FLIGHT  = new Set(["departure", "arrival_mng", "arrival_driveway"]);
// name board only for meet & greet (required — driver writes this on the board)
const NEEDS_NAMEBOARD = new Set(["arrival_mng"]);

interface Account { id: string; name: string; }
interface Driver  { id: string; firstName: string; lastName: string; }
interface Vehicle { id: string; plateNumber: string; make: string; model: string; }

export default function NewOrderPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [drivers,  setDrivers]  = useState<Driver[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);

  const [form, setForm] = useState({
    accountId:         "",
    serviceType:       "",
    pickupTime:        "",
    pickupLocation:    "",
    dropoffLocation:   "",
    flightNumber:      "",
    nameBoardText:     "",
    disposalHours:     "",
    passengerName:     "",
    passengerWhatsapp: "",
    sameAsRequestor:   false,
    fareAmount:           "",
    fareNote:             "",
    driverPayableAmount:  "",
    driverId:             "",
    vehicleId:            "",
    notes:                "",
  });

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  useEffect(() => {
    Promise.all([
      fetch("/api/accounts").then(r => r.json()),
      fetch("/api/drivers?status=active").then(r => r.json()),
      fetch("/api/vehicles?status=active").then(r => r.json()),
    ]).then(([a, d, v]) => {
      setAccounts(Array.isArray(a) ? a : []);
      setDrivers(Array.isArray(d) ? d : []);
      setVehicles(Array.isArray(v) ? v : []);
    });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.accountId || !form.serviceType) {
      setError("Account and service type are required");
      return;
    }
    if (!form.pickupTime || !form.pickupLocation.trim()) {
      setError("Pickup date/time and location are required");
      return;
    }
    if (NEEDS_DROPOFF.has(form.serviceType) && !form.dropoffLocation.trim()) {
      setError("Drop-off location is required for this service type");
      return;
    }
    if (NEEDS_NAMEBOARD.has(form.serviceType) && !form.nameBoardText.trim()) {
      setError("Name board text is required for meet & greet");
      return;
    }
    if (form.serviceType === "disposal" && !form.disposalHours) {
      setError("Minimum hours is required for disposal");
      return;
    }
    if (form.driverId && (!form.driverPayableAmount || parseFloat(form.driverPayableAmount) <= 0)) {
      setError("Driver payable amount is required when assigning a driver");
      return;
    }

    setLoading(true);
    setError(null);

    const st = form.serviceType;
    const res = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        accountId:         form.accountId,
        tenantId:          "lypx_direct",
        serviceType:       st,
        pickupTime:        form.pickupTime,
        pickupLocation:    form.pickupLocation,
        // disposal has no fixed dropoff
        dropoffLocation:   st === "disposal" ? null : (form.dropoffLocation.trim() || null),
        flightNumber:      SHOWS_FLIGHT.has(st)    ? (form.flightNumber.trim()  || null) : null,
        nameBoardText:     NEEDS_NAMEBOARD.has(st) ? (form.nameBoardText.trim() || null) : null,
        disposalHours:     st === "disposal"       ? (form.disposalHours ? parseInt(form.disposalHours, 10) : null) : null,
        passengerName:     form.passengerName.trim() || null,
        passengerWhatsapp: form.sameAsRequestor ? null : (form.passengerWhatsapp || null),
        sameAsRequestor:   form.sameAsRequestor,
        fareAmount:           form.fareAmount ? parseFloat(form.fareAmount) : null,
        fareCurrency:         "SGD",
        fareNote:             form.fareNote.trim() || null,
        driverPayableAmount:  form.driverId && form.driverPayableAmount ? parseFloat(form.driverPayableAmount) : null,
        driverId:             form.driverId  || null,
        vehicleId:            form.vehicleId || null,
        notes:             form.notes.trim() || null,
        timezone:          "Asia/Singapore",
      }),
    });

    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Failed to create order");
      return;
    }
    router.push(`/orders/${data.id}`);
  }

  const st               = form.serviceType;
  const isArrival        = st === "arrival_mng" || st === "arrival_driveway";
  const showDropoff      = !!st && st !== "disposal";
  const dropoffRequired  = NEEDS_DROPOFF.has(st);
  const showFlight       = SHOWS_FLIGHT.has(st);
  const showNameboard    = NEEDS_NAMEBOARD.has(st);
  const showDisposal     = st === "disposal";
  const showFlexibleNote = st === "flexible";
  const showSections     = !!st;

  const sec = "block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 pt-5 border-t border-gray-800";
  const inp = "bg-gray-900 border-gray-700";
  const lbl = "text-gray-300";
  const opt = <span className="text-gray-600 font-normal normal-case"> (optional)</span>;

  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-white">New Order</h1>
        <p className="text-sm text-gray-500 mt-1">LyPX Direct trip</p>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-4 border-red-800 bg-red-950">
          <AlertDescription className="text-red-300">{error}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">

        {/* ── Core ── */}
        <div className="space-y-1.5">
          <Label className={lbl}>Account</Label>
          <Select value={form.accountId} onValueChange={v => set("accountId", v ?? "")}>
            <SelectTrigger className={inp}>
              <SelectValue placeholder="Select account…" />
            </SelectTrigger>
            <SelectContent className="bg-gray-900 border-gray-700">
              {accounts.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className={lbl}>Service Type</Label>
          <Select value={form.serviceType} onValueChange={v => set("serviceType", v ?? "")}>
            <SelectTrigger className={inp}>
              <SelectValue placeholder="Select service type…" />
            </SelectTrigger>
            <SelectContent className="bg-gray-900 border-gray-700">
              {SERVICE_TYPES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="pickupTime" className={lbl}>Pickup Date & Time</Label>
          <Input id="pickupTime" type="datetime-local" className={inp}
            value={form.pickupTime} onChange={e => set("pickupTime", e.target.value)} />
        </div>

        {/* ── Locations ── */}
        {showSections && (
          <>
            <p className={sec}>Locations</p>

            <div className="space-y-1.5">
              <Label className={lbl}>{isArrival ? "Arrival Terminal" : "Pickup Location"}</Label>
              <Input className={inp}
                placeholder={isArrival ? "e.g. T1 Arrivals, Changi Airport" : "e.g. 10 Orchard Road, Singapore"}
                value={form.pickupLocation} onChange={e => set("pickupLocation", e.target.value)} />
            </div>

            {showDropoff && (
              <div className="space-y-1.5">
                <Label className={lbl}>
                  {st === "departure" ? "Departure Terminal" : "Drop-off Location"}
                  {!dropoffRequired && opt}
                </Label>
                <Input className={inp}
                  placeholder={st === "departure" ? "e.g. T3, Changi Airport" : "e.g. 20 Sentosa Cove"}
                  value={form.dropoffLocation} onChange={e => set("dropoffLocation", e.target.value)} />
              </div>
            )}

            {showFlexibleNote && (
              <p className="text-xs text-gray-500 pl-0.5">
                Pickup and drop-off required. Driver may convert to disposal if agreed with passenger.
              </p>
            )}
          </>
        )}

        {/* ── Trip Details ── */}
        {showSections && (showFlight || showNameboard || showDisposal) && (
          <>
            <p className={sec}>Trip Details</p>

            {showFlight && (
              <div className="space-y-1.5">
                <Label className={lbl}>Flight Number{opt}</Label>
                <Input className={inp} placeholder="e.g. SQ321"
                  value={form.flightNumber} onChange={e => set("flightNumber", e.target.value)} />
              </div>
            )}

            {showNameboard && (
              <div className="space-y-1.5">
                <Label className={lbl}>Name Board Text</Label>
                <Input className={inp} placeholder="e.g. Mr. Lukas Schmidlin | LyPX"
                  value={form.nameBoardText} onChange={e => set("nameBoardText", e.target.value)} />
              </div>
            )}

            {showDisposal && (
              <div className="space-y-1.5">
                <Label className={lbl}>Minimum Hours</Label>
                <Input type="number" min={2} max={24} className={inp} placeholder="e.g. 4"
                  value={form.disposalHours} onChange={e => set("disposalHours", e.target.value)} />
              </div>
            )}
          </>
        )}

        {/* ── Passenger ── */}
        {showSections && (
          <>
            <p className={sec}>Passenger</p>

            <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", marginBottom: 12 }}>
              <input type="checkbox" checked={form.sameAsRequestor}
                onChange={e => set("sameAsRequestor", e.target.checked)}
                style={{ accentColor: "var(--gold)" }} />
              <span className="text-sm text-gray-300">Passenger is the same as requestor</span>
            </label>

            <div className="space-y-1.5">
              <Label className={lbl}>Passenger Name{opt}</Label>
              <Input className={inp} placeholder="Name of traveller"
                value={form.passengerName} onChange={e => set("passengerName", e.target.value)} />
            </div>

            {!form.sameAsRequestor && (
              <PhoneInput
                label="Passenger WhatsApp"
                value={form.passengerWhatsapp}
                onChange={v => set("passengerWhatsapp", v)}
                hint="Passenger receives trip status notifications on this number"
              />
            )}
          </>
        )}

        {/* ── Fare ── */}
        {showSections && (
          <>
            <p className={sec}>Fare</p>

            <div className="flex gap-3">
              <div className="flex-1 space-y-1.5">
                <Label className={lbl}>Amount (SGD){opt}</Label>
                <Input type="number" min={0} step="0.01" className={inp} placeholder="0.00"
                  value={form.fareAmount} onChange={e => set("fareAmount", e.target.value)} />
              </div>
              <div className="flex-1 space-y-1.5">
                <Label className={lbl}>Note{opt}</Label>
                <Input className={inp} placeholder="e.g. Corporate rate"
                  value={form.fareNote} onChange={e => set("fareNote", e.target.value)} />
              </div>
            </div>
          </>
        )}

        {/* ── Assignment ── */}
        {showSections && (
          <>
            <p className={sec}>Assignment{opt}</p>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className={lbl}>Driver</Label>
                <Select value={form.driverId || "__none"} onValueChange={v => set("driverId", !v || v === "__none" ? "" : v)}>
                  <SelectTrigger className={inp}>
                    <SelectValue placeholder="Unassigned" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-900 border-gray-700">
                    <SelectItem value="__none">Unassigned</SelectItem>
                    {drivers.map(d => (
                      <SelectItem key={d.id} value={d.id}>{d.firstName} {d.lastName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className={lbl}>Vehicle</Label>
                <Select value={form.vehicleId || "__none"} onValueChange={v => set("vehicleId", !v || v === "__none" ? "" : v)}>
                  <SelectTrigger className={inp}>
                    <SelectValue placeholder="Unassigned" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-900 border-gray-700">
                    <SelectItem value="__none">Unassigned</SelectItem>
                    {vehicles.map(v => (
                      <SelectItem key={v.id} value={v.id}>{v.plateNumber} — {v.make} {v.model}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {form.driverId && (
              <div className="space-y-1.5">
                <Label className={lbl}>
                  Driver Payable (SGD) <span className="text-red-400">*</span>
                </Label>
                <Input type="number" min={0} step="0.01" className={inp} placeholder="0.00"
                  value={form.driverPayableAmount}
                  onChange={e => set("driverPayableAmount", e.target.value)} />
                <p className="text-xs text-gray-600">Amount committed to driver — required when assigning</p>
              </div>
            )}
          </>
        )}

        {/* ── Notes ── */}
        {showSections && (
          <>
            <p className={sec}>Notes{opt}</p>
            <Textarea className="bg-gray-900 border-gray-700 text-white resize-none" rows={3}
              placeholder="Any special instructions"
              value={form.notes} onChange={e => set("notes", e.target.value)} />
          </>
        )}

        <div className="flex gap-3 pt-4">
          <Button type="submit" disabled={loading || !form.accountId || !form.serviceType}>
            {loading ? "Creating…" : "Create Order"}
          </Button>
          <Button type="button" variant="outline" className="border-gray-700 text-gray-300"
            onClick={() => router.back()}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
