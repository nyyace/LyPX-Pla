"use client";

import { useState, useEffect } from "react";

export default function PartnerSettingsPage() {
  const [picName,     setPicName]     = useState("");
  const [picWhatsapp, setPicWhatsapp] = useState("");
  const [picEmail,    setPicEmail]    = useState("");
  const [saving,      setSaving]      = useState(false);
  const [saveStatus,  setSaveStatus]  = useState<"idle"|"success"|"error">("idle");

  useEffect(() => {
    fetch("/api/partner/settings")
      .then(r => r.json())
      .then(d => {
        setPicName(d.picName ?? "");
        setPicWhatsapp(d.picWhatsapp ?? "");
        setPicEmail(d.picEmail ?? "");
      });
  }, []);

  // Inline PhoneInput logic — avoids re-importing the component into a client page
  // that already imports useState/useEffect. The PhoneInput component can be used
  // in server/client contexts; here we just inline the display for simplicity.

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaveStatus("idle");
    try {
      const res = await fetch("/api/partner/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          picName:     picName.trim()     || null,
          picWhatsapp: picWhatsapp.trim() || null,
          picEmail:    picEmail.trim()    || null,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      setSaveStatus("success");
      setTimeout(() => setSaveStatus("idle"), 2500);
    } catch {
      setSaveStatus("error");
      setTimeout(() => setSaveStatus("idle"), 2500);
    } finally {
      setSaving(false);
    }
  }

  const inputCls = "w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-md text-sm text-white placeholder-gray-600 focus:outline-none focus:border-yellow-600";
  const labelCls = "block text-sm text-gray-300 mb-1";

  return (
    <div className="p-8 max-w-md">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-white">Settings</h1>
        <p className="text-sm text-gray-500 mt-1">Update your contact details for notifications</p>
      </div>

      <form onSubmit={handleSave} className="space-y-5">
        <div>
          <label className={labelCls}>Contact Name</label>
          <input
            type="text" value={picName}
            onChange={e => setPicName(e.target.value)}
            placeholder="e.g. Mr. Tan Wei Ming"
            className={inputCls}
          />
        </div>

        <div>
          <label className={labelCls}>WhatsApp Number</label>
          <input
            type="tel" value={picWhatsapp}
            onChange={e => setPicWhatsapp(e.target.value)}
            placeholder="+65 9123 4567"
            className={inputCls}
          />
          <p className="text-xs text-gray-600 mt-1">Trip status updates are sent to this number</p>
        </div>

        <div>
          <label className={labelCls}>Email</label>
          <input
            type="email" value={picEmail}
            onChange={e => setPicEmail(e.target.value)}
            placeholder="you@company.com"
            className={inputCls}
          />
        </div>

        <div className="flex items-center gap-4 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2 bg-yellow-600 text-black text-sm font-semibold rounded-md hover:bg-yellow-500 disabled:opacity-50 transition-colors"
          >
            {saving ? "Saving…" : "Save Changes"}
          </button>
          {saveStatus === "success" && <span className="text-sm text-green-400">✓ Saved</span>}
          {saveStatus === "error"   && <span className="text-sm text-red-400">✗ Failed</span>}
        </div>
      </form>

      <div className="mt-8 pt-6 border-t border-gray-800">
        <p className="text-xs text-gray-600">
          Company name, account type, and billing details are managed by your LyPX account manager.
          Contact LyPX to update those details.
        </p>
      </div>
    </div>
  );
}
