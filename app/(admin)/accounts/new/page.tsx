"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PhoneInput } from "@/components/ui/PhoneInput";

const CUSTOMER_SEGMENTS = [
  { value: "hotel",             label: "Hotel" },
  { value: "mice",              label: "MICE" },
  { value: "tdm",               label: "Tour & Destination" },
  { value: "dmc",               label: "DMC" },
  { value: "corporate_general", label: "Corporate (General)" },
];

const SOURCE_TYPES = [
  { value: "lypx_sourced",     label: "LyPX Sourced (Eric / Roger)" },
  { value: "operator_sourced", label: "Operator Sourced" },
];

const LYPX_OPS_STAFF = ["Eric Wong", "Roger Yap"];

type FormState = {
  accountType:     string;
  name:            string;
  uen:             string;
  customerSegment: string;
  sourceType:      string;
  picName:         string;
  picWhatsapp:     string;
  picEmail:        string;
};

export default function NewAccountPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState<FormState>({
    accountType:     "business_entity",
    name:            "",
    uen:             "",
    customerSegment: "",
    sourceType:      "lypx_sourced",
    picName:         "",
    picWhatsapp:     "",
    picEmail:        "",
  });

  const isIndividual = form.accountType === "individual";

  function update(field: keyof FormState, value: string) {
    setForm(f => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountType:     form.accountType,
          name:            form.name,
          uen:             isIndividual ? null : (form.uen || null),
          customerSegment: isIndividual ? "individual" : form.customerSegment,
          sourceType:      isIndividual ? "lypx_sourced" : form.sourceType,
          picName:         form.picName || null,
          picWhatsapp:     form.picWhatsapp || null,
          picEmail:        form.picEmail || null,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error ?? "Failed to create account");
      }
      const account = await res.json();
      router.push(`/accounts/${account.id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create account");
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
        <h1 className="text-2xl font-semibold text-white">New Account</h1>
        <p className="text-sm text-gray-500 mt-1">A 90-day claim is created automatically</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">

        {/* Account Type — two cards */}
        <div>
          <label className={labelCls}>Account Type *</label>
          <div className="grid grid-cols-2 gap-3">
            {[
              {
                value: "business_entity",
                label: "Business Entity",
                desc: "Company, hotel, or corporate account",
              },
              {
                value: "individual",
                label: "Individual / Direct",
                desc: "Personal customer managed by LyPX",
              },
            ].map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => update("accountType", opt.value)}
                className={`p-4 rounded-lg border text-left transition-colors ${
                  form.accountType === opt.value
                    ? "border-yellow-600 bg-yellow-900/20"
                    : "border-gray-700 bg-gray-900 hover:border-gray-600"
                }`}
              >
                <div className="text-sm font-semibold text-white">{opt.label}</div>
                <div className="text-xs text-gray-500 mt-0.5">{opt.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Name */}
        <div>
          <label className={labelCls}>{isIndividual ? "Full Name *" : "Company Name *"}</label>
          <input
            type="text"
            value={form.name}
            onChange={e => update("name", e.target.value)}
            required
            placeholder={isIndividual ? "e.g. Mr. Lukas Schmidlin" : "e.g. Lets Fly Travel Pte. Ltd."}
            className={inputCls}
          />
        </div>

        {/* UEN — business only */}
        {!isIndividual && (
          <div>
            <label className={labelCls}>UEN (optional)</label>
            <input
              type="text"
              value={form.uen}
              onChange={e => update("uen", e.target.value)}
              placeholder="e.g. 202339535G"
              className={inputCls}
            />
          </div>
        )}

        {/* Customer Segment — business only */}
        {!isIndividual && (
          <div>
            <label className={labelCls}>Customer Segment *</label>
            <select
              value={form.customerSegment}
              onChange={e => update("customerSegment", e.target.value)}
              required
              className={selectCls}
            >
              <option value="">Select...</option>
              {CUSTOMER_SEGMENTS.map(s => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
        )}

        {/* Source / Handled By */}
        <div>
          <label className={labelCls}>{isIndividual ? "Handled By *" : "Source *"}</label>
          {isIndividual ? (
            <select
              value={form.picName}
              onChange={e => { update("picName", e.target.value); update("sourceType", "lypx_sourced"); }}
              required
              className={selectCls}
            >
              <option value="">Select person...</option>
              {LYPX_OPS_STAFF.map(name => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          ) : (
            <select
              value={form.sourceType}
              onChange={e => update("sourceType", e.target.value)}
              required
              className={selectCls}
            >
              {SOURCE_TYPES.map(s => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          )}
        </div>

        {/* Contact details section */}
        <div className="pt-3 border-t border-gray-800 space-y-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            {isIndividual ? "Customer Contact" : "Point of Contact"}
          </p>

          {/* picName — business only (individual uses name field) */}
          {!isIndividual && (
            <div>
              <label className={labelCls}>Contact Person Name</label>
              <input
                type="text"
                value={form.picName}
                onChange={e => update("picName", e.target.value)}
                placeholder="e.g. Mr. Tan Wei Ming"
                className={inputCls}
              />
            </div>
          )}

          {/* picWhatsapp — required, drives notifications */}
          <div>
            <PhoneInput
              label={`WhatsApp Number${isIndividual ? " *" : " *"}`}
              value={form.picWhatsapp}
              onChange={v => update("picWhatsapp", v)}
              required
              hint={
                isIndividual
                  ? "Customer receives all trip notifications on this number"
                  : "Requestor receives all trip notifications on this number"
              }
            />
          </div>

          {/* picEmail */}
          <div>
            <label className={labelCls}>Email (optional)</label>
            <input
              type="email"
              value={form.picEmail}
              onChange={e => update("picEmail", e.target.value)}
              placeholder="email@example.com"
              className={inputCls}
            />
          </div>
        </div>

        {error && (
          <div className="p-3 bg-red-950 border border-red-800 rounded-md text-sm text-red-300">
            {error}
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex-1 px-4 py-2 border border-gray-700 rounded-md text-sm text-gray-400 hover:text-white hover:border-gray-500 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 px-4 py-2 bg-yellow-600 text-black text-sm font-semibold rounded-md hover:bg-yellow-500 disabled:opacity-50 transition-colors"
          >
            {loading ? "Creating…" : "Create Account"}
          </button>
        </div>
      </form>
    </div>
  );
}
