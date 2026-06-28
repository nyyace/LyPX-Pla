"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PhoneInput } from "@/components/ui/PhoneInput";

const SERVICE_TYPES = [
  { value: "p2p",              label: "Point to Point" },
  { value: "departure",        label: "Airport Departure" },
  { value: "arrival_mng",      label: "Airport Arrival (Meet & Greet)" },
  { value: "arrival_driveway", label: "Airport Arrival (Driveway)" },
  { value: "disposal",         label: "Hourly Disposal" },
  { value: "flexible",         label: "Flexible / Charter" },
];

const NEEDS_FLIGHT  = new Set(["departure", "arrival_mng", "arrival_driveway"]);
const NEEDS_BOARD   = new Set(["arrival_mng"]);
const NEEDS_HOURS   = new Set(["disposal"]);
const DROPOFF_OPT   = new Set(["disposal", "flexible"]);

type FormState = {
  serviceType:       string;
  date:              string;
  time:              string;
  pickupLocation:    string;
  dropoffLocation:   string;
  flightNumber:      string;
  nameBoardText:     string;
  disposalHours:     string;
  passengerName:     string;
  passengerWhatsapp: string;
  notes:             string;
};

export default function PartnerNewBookingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState<FormState>({
    serviceType:       "p2p",
    date:              "",
    time:              "",
    pickupLocation:    "",
    dropoffLocation:   "",
    flightNumber:      "",
    nameBoardText:     "",
    disposalHours:     "",
    passengerName:     "",
    passengerWhatsapp: "",
    notes:             "",
  });

  function set(field: keyof FormState, value: string) {
    setForm(f => ({ ...f, [field]: value }));
  }

  const dropoffOptional = DROPOFF_OPT.has(form.serviceType);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (NEEDS_FLIGHT.has(form.serviceType) && !form.flightNumber.trim()) {
      setError("Flight number is required for airport transfers"); return;
    }
    if (NEEDS_BOARD.has(form.serviceType) && !form.nameBoardText.trim()) {
      setError("Paging / name board content is required for Meet & Greet"); return;
    }
    if (NEEDS_HOURS.has(form.serviceType) && !form.disposalHours) {
      setError("Number of hours is required for disposal bookings"); return;
    }

    setLoading(true);
    try {
      const pickupTime = new Date(`${form.date}T${form.time}:00`).toISOString();

      const res = await fetch("/api/partner/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceType:    form.serviceType,
          pickupTime,
          pickupLocation: form.pickupLocation.trim(),
          dropoffLocation: !dropoffOptional ? (form.dropoffLocation.trim() || null) : null,
          flightNumber:   NEEDS_FLIGHT.has(form.serviceType) ? form.flightNumber.trim() || null : null,
          nameBoardText:  NEEDS_BOARD.has(form.serviceType) ? form.nameBoardText.trim() || null : null,
          disposalHours:  NEEDS_HOURS.has(form.serviceType) ? parseInt(form.disposalHours) || null : null,
          passengerName:  form.passengerName.trim() || null,
          passengerWhatsapp: form.passengerWhatsapp || null,
          notes:          form.notes.trim() || null,
        }),
      });

      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error ?? "Failed to submit booking");
      }

      router.push("/partner/bookings");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to submit booking");
    } finally {
      setLoading(false);
    }
  }

  const inputCls = "w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-md text-sm text-white placeholder-gray-600 focus:outline-none focus:border-yellow-600";
  const selectCls = inputCls + " cursor-pointer";
  const labelCls = "block text-sm text-gray-300 mb-1";

  return (
    <div className="p-8 max-w-lg">
      <div className="mb-6">
        <button onClick={() => router.back()} className="text-xs text-gray-500 hover:text-gray-300 mb-3 block">
          ← Back to bookings
        </button>
        <h1 className="text-2xl font-semibold text-white">New Booking Request</h1>
        <p className="text-sm text-gray-500 mt-1">LyPX will review and assign a driver</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">

        {/* Service type */}
        <div>
          <label className={labelCls}>Service Type *</label>
          <select value={form.serviceType} onChange={e => set("serviceType", e.target.value)} className={selectCls}>
            {SERVICE_TYPES.map(t => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>

        {/* Date + Time */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Date *</label>
            <input type="date" value={form.date} onChange={e => set("date", e.target.value)} required className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Time *</label>
            <input type="time" value={form.time} onChange={e => set("time", e.target.value)} required className={inputCls} />
          </div>
        </div>

        {/* Pickup */}
        <div>
          <label className={labelCls}>Pickup Address *</label>
          <input
            type="text" value={form.pickupLocation}
            onChange={e => set("pickupLocation", e.target.value)}
            required placeholder="e.g. 1 Raffles Place, Singapore"
            className={inputCls}
          />
        </div>

        {/* Dropoff — hidden for disposal */}
        {!dropoffOptional && (
          <div>
            <label className={labelCls}>Dropoff Address *</label>
            <input
              type="text" value={form.dropoffLocation}
              onChange={e => set("dropoffLocation", e.target.value)}
              required={!dropoffOptional}
              placeholder="e.g. Changi Airport Terminal 3"
              className={inputCls}
            />
          </div>
        )}

        {/* Flight number — airport jobs */}
        {NEEDS_FLIGHT.has(form.serviceType) && (
          <div>
            <label className={labelCls}>Flight Number *</label>
            <input
              type="text" value={form.flightNumber}
              onChange={e => set("flightNumber", e.target.value)}
              placeholder="e.g. SQ321"
              className={inputCls}
            />
          </div>
        )}

        {/* Name board — Meet & Greet only */}
        {NEEDS_BOARD.has(form.serviceType) && (
          <div>
            <label className={labelCls}>Paging / Name Board Content *</label>
            <input
              type="text" value={form.nameBoardText}
              onChange={e => set("nameBoardText", e.target.value)}
              placeholder="e.g. Mr. John Smith — Prestige Corp"
              className={inputCls}
            />
          </div>
        )}

        {/* Disposal hours */}
        {NEEDS_HOURS.has(form.serviceType) && (
          <div>
            <label className={labelCls}>No. of Hours *</label>
            <input
              type="number" min={1} max={24}
              value={form.disposalHours}
              onChange={e => set("disposalHours", e.target.value)}
              placeholder="e.g. 4"
              className={inputCls}
            />
          </div>
        )}

        {/* Passenger details */}
        <div className="pt-3 border-t border-gray-800 space-y-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Passenger</p>
          <div>
            <label className={labelCls}>Passenger Name</label>
            <input
              type="text" value={form.passengerName}
              onChange={e => set("passengerName", e.target.value)}
              placeholder="e.g. Mr. David Lee"
              className={inputCls}
            />
          </div>
          <PhoneInput
            label="Passenger WhatsApp"
            value={form.passengerWhatsapp}
            onChange={v => set("passengerWhatsapp", v)}
            hint="Passenger receives trip status updates on this number"
          />
        </div>

        {/* Special requests */}
        <div>
          <label className={labelCls}>Special Requests</label>
          <textarea
            value={form.notes}
            onChange={e => set("notes", e.target.value)}
            rows={3}
            placeholder="Any special requirements, preferences, or notes for LyPX..."
            className={inputCls + " resize-none"}
          />
        </div>

        {error && (
          <div className="p-3 bg-red-950 border border-red-800 rounded-md text-sm text-red-300">{error}</div>
        )}

        <div className="flex gap-3 pt-2">
          <button
            type="button" onClick={() => router.back()}
            className="flex-1 px-4 py-2 border border-gray-700 rounded-md text-sm text-gray-400 hover:text-white hover:border-gray-500 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit" disabled={loading}
            className="flex-1 px-4 py-2 bg-yellow-600 text-black text-sm font-semibold rounded-md hover:bg-yellow-500 disabled:opacity-50 transition-colors"
          >
            {loading ? "Submitting…" : "Submit Booking Request"}
          </button>
        </div>
      </form>
    </div>
  );
}
