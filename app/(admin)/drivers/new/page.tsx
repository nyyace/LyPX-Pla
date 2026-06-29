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
  const [inviteLink,  setInviteLink]  = useState<string | null>(null);
  const [linkCopied,  setLinkCopied]  = useState(false);

  const [manualPhone,    setManualPhone]    = useState("");
  const [manualFirst,    setManualFirst]    = useState("");
  const [manualLast,     setManualLast]     = useState("");
  const [manualLicense,  setManualLicense]  = useState("");
  const [manualNationalId, setManualNationalId] = useState("");
  const [manualRelType,  setManualRelType]  = useState("contracted");
  const [sendInvite,     setSendInvite]     = useState(false);

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
        driverWhatsapp: invitePhone || undefined,
        driverName: inviteName.trim() || null,
      }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Failed to create invite");
      return;
    }
    if (!invitePhone) {
      setInviteLink(data.onboardLink);
    } else {
      setSuccess(invitePhone);
    }
    setInviteName("");
    setInvitePhone("");
  }

  async function copyLink() {
    if (!inviteLink) return;
    await navigator.clipboard.writeText(inviteLink);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  }

  async function handleManual(e: React.FormEvent) {
    e.preventDefault();
    if (!manualFirst.trim() || !manualLast.trim() || !manualPhone || !manualLicense.trim() || !manualNationalId.trim()) {
      setError("All fields are required");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/drivers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName:        manualFirst.trim(),
          lastName:         manualLast.trim(),
          phoneNumber:      manualPhone,
          licenseNumber:    manualLicense.trim(),
          nationalId:       manualNationalId.trim(),
          relationshipType: manualRelType,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to create driver");
        return;
      }
      if (sendInvite && manualPhone) {
        await fetch("/api/admin/driver-invite-requests", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            driverWhatsapp: manualPhone,
            driverName: `${manualFirst} ${manualLast}`.trim(),
          }),
        });
      }
      router.push(`/drivers/${data.id}`);
    } catch {
      setError("Unexpected error — please try again");
    } finally {
      setLoading(false);
    }
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
              WhatsApp self-boarding link sent to {success}. The driver has 24 hours to complete onboarding.
            </p>
            <div className="flex gap-3 mt-4">
              <Button size="sm" onClick={() => setSuccess(null)}>Send another</Button>
              <Button size="sm" variant="outline" className="border-gray-700 text-gray-300"
                onClick={() => router.push("/drivers")}>
                Back to drivers
              </Button>
            </div>
          </div>
        ) : inviteLink ? (
          <div style={{
            background: "rgba(34, 197, 94, 0.08)",
            border: "1px solid rgba(34, 197, 94, 0.3)",
            borderRadius: 8,
            padding: "20px 24px",
          }}>
            <p className="text-green-400 font-semibold text-sm mb-1">Mass onboarding link ready</p>
            <p className="text-gray-400 text-sm mb-3">
              Share this link with any number of drivers. Anyone with the link can onboard. Expires in 24 hours.
            </p>
            <div style={{
              background: "rgba(0,0,0,0.3)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 6,
              padding: "10px 14px",
              fontFamily: "monospace",
              fontSize: 12,
              color: "#a0a0a0",
              wordBreak: "break-all",
              marginBottom: 12,
            }}>
              {inviteLink}
            </div>
            <div className="flex gap-3">
              <Button size="sm" onClick={copyLink}>
                {linkCopied ? "Copied!" : "Copy link"}
              </Button>
              <Button size="sm" onClick={() => setInviteLink(null)}>Generate another</Button>
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
              hint="Leave blank to generate a shareable link for mass onboarding"
              value={invitePhone}
              onChange={setInvitePhone}
            />
            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={loading}>
                {loading ? "Creating…" : invitePhone ? "Send Self-Boarding Invite" : "Generate Mass Invite Link"}
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
              <Label className="text-gray-300">First name</Label>
              <Input value={manualFirst} onChange={e => setManualFirst(e.target.value)}
                placeholder="e.g. Ahmad" className="bg-gray-900 border-gray-700" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-gray-300">Last name</Label>
              <Input value={manualLast} onChange={e => setManualLast(e.target.value)}
                placeholder="e.g. bin Ismail" className="bg-gray-900 border-gray-700" />
            </div>
          </div>

          <PhoneInput
            label="Phone Number"
            value={manualPhone}
            onChange={setManualPhone}
          />

          <div className="space-y-1.5">
            <Label className="text-gray-300">Driver license number</Label>
            <Input value={manualLicense} onChange={e => setManualLicense(e.target.value)}
              placeholder="e.g. S12345A" className="bg-gray-900 border-gray-700" />
          </div>

          <div className="space-y-1.5">
            <Label className="text-gray-300">National ID (NRIC/FIN)</Label>
            <Input value={manualNationalId} onChange={e => setManualNationalId(e.target.value)}
              placeholder="e.g. S1234567A" className="bg-gray-900 border-gray-700" />
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
