"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { PhoneInput } from "@/components/ui/PhoneInput";

type Tab = "invite" | "manual";

export default function NewDriverPage() {
  const router = useRouter();
  const [tab, setTab]       = useState<Tab>("invite");
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [inviteName,  setInviteName]  = useState("");
  const [invitePhone, setInvitePhone] = useState("");

  const [manualPhone,  setManualPhone]  = useState("");
  const [manualRelType, setManualRelType] = useState("contracted");
  const [sendInvite,   setSendInvite]  = useState(false);

  function switchTab(t: Tab) {
    setTab(t);
    setError(null);
    setSuccess(null);
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch("/api/admin/driver-invite-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        driverWhatsapp: invitePhone,
        driverName: inviteName.trim() || null,
      }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Failed to send invite");
      return;
    }
    setSuccess(invitePhone);
    setInviteName("");
    setInvitePhone("");
  }

  async function handleManual(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    const firstName = String(form.get("firstName") ?? "");
    const lastName  = String(form.get("lastName")  ?? "");
    const res = await fetch("/api/drivers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        firstName,
        lastName,
        phoneNumber:      manualPhone,
        licenseNumber:    form.get("licenseNumber"),
        nationalId:       form.get("nationalId"),
        relationshipType: manualRelType,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setLoading(false);
      setError(data.error ?? "Failed to create driver");
      return;
    }
    if (sendInvite && manualPhone) {
      await fetch("/api/admin/driver-invite-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          driverWhatsapp: manualPhone,
          driverName: `${firstName} ${lastName}`.trim(),
        }),
      });
    }
    setLoading(false);
    router.push(`/drivers/${data.id}`);
  }

  const tabBtnStyle = (active: boolean): React.CSSProperties => ({
    padding: "8px 20px",
    fontSize: 13,
    fontWeight: 600,
    borderRadius: 4,
    border: "1px solid",
    cursor: "pointer",
    background: "none",
    borderColor: active ? "var(--gold)" : "var(--border)",
    backgroundColor: active ? "rgba(212, 160, 23, 0.1)" : "transparent",
    color: active ? "var(--gold)" : "var(--text-dim)",
  });

  return (
    <div className="p-8 max-w-lg">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-white">Add Driver</h1>
        <p className="text-sm text-gray-500 mt-1">Choose how to add the driver to the platform</p>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 28 }}>
        <button type="button" onClick={() => switchTab("invite")} style={tabBtnStyle(tab === "invite")}>
          Self-Boarding Invite
        </button>
        <button type="button" onClick={() => switchTab("manual")} style={tabBtnStyle(tab === "manual")}>
          Manual Entry
        </button>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-4 border-red-800 bg-red-950">
          <AlertDescription className="text-red-300">{error}</AlertDescription>
        </Alert>
      )}

      {tab === "invite" && (
        success ? (
          <div style={{
            background: "rgba(34, 197, 94, 0.08)",
            border: "1px solid rgba(34, 197, 94, 0.3)",
            borderRadius: 8,
            padding: "20px 24px",
          }}>
            <p className="text-green-400 font-semibold text-sm mb-1">Invite sent</p>
            <p className="text-gray-400 text-sm">
              WhatsApp self-boarding link sent to {success}. The driver has 7 days to complete onboarding.
            </p>
            <div className="flex gap-3 mt-4">
              <Button size="sm" onClick={() => setSuccess(null)}>Send another</Button>
              <Button size="sm" variant="outline" className="border-gray-700 text-gray-300"
                onClick={() => router.push("/drivers")}>
                Back to drivers
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleInvite} className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-gray-300">
                Driver Name <span className="text-gray-600">(optional)</span>
              </Label>
              <Input
                value={inviteName}
                onChange={e => setInviteName(e.target.value)}
                placeholder="e.g. Ahmad bin Ismail"
                className="bg-gray-900 border-gray-700"
              />
            </div>
            <PhoneInput
              label="WhatsApp Number"
              value={invitePhone}
              onChange={setInvitePhone}
              required
            />
            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={loading || !invitePhone}>
                {loading ? "Sending…" : "Send Self-Boarding Invite"}
              </Button>
              <Button type="button" variant="outline" className="border-gray-700 text-gray-300"
                onClick={() => router.back()}>
                Cancel
              </Button>
            </div>
          </form>
        )
      )}

      {tab === "manual" && (
        <form onSubmit={handleManual} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="firstName" className="text-gray-300">First name</Label>
              <Input id="firstName" name="firstName" required className="bg-gray-900 border-gray-700" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lastName" className="text-gray-300">Last name</Label>
              <Input id="lastName" name="lastName" required className="bg-gray-900 border-gray-700" />
            </div>
          </div>

          <PhoneInput
            label="Phone Number"
            value={manualPhone}
            onChange={setManualPhone}
            required
          />

          <div className="space-y-1.5">
            <Label htmlFor="licenseNumber" className="text-gray-300">Driver license number</Label>
            <Input id="licenseNumber" name="licenseNumber" required className="bg-gray-900 border-gray-700" />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="nationalId" className="text-gray-300">National ID (NRIC/FIN)</Label>
            <Input id="nationalId" name="nationalId" required className="bg-gray-900 border-gray-700" />
          </div>

          <div className="space-y-1.5">
            <Label className="text-gray-300">Relationship type</Label>
            <Select value={manualRelType} onValueChange={v => setManualRelType(v ?? "contracted")}>
              <SelectTrigger className="bg-gray-900 border-gray-700">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-gray-900 border-gray-700">
                <SelectItem value="employed">Employed</SelectItem>
                <SelectItem value="contracted">Contracted</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={sendInvite}
              onChange={e => setSendInvite(e.target.checked)}
              style={{ accentColor: "var(--gold)" }}
            />
            <span className="text-sm text-gray-400">Also send WhatsApp self-boarding invite</span>
          </label>

          <div className="flex gap-3 pt-2">
            <Button type="submit" disabled={loading}>
              {loading ? "Creating…" : "Create Driver"}
            </Button>
            <Button type="button" variant="outline" className="border-gray-700 text-gray-300"
              onClick={() => router.back()}>
              Cancel
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
