"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function AccountSettingsSection({
  accountId,
  tier2PartnerAccount,
}: {
  accountId: string;
  tier2PartnerAccount: boolean;
}) {
  const router = useRouter();
  const [checked, setChecked] = useState(tier2PartnerAccount);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function handleSave() {
    setLoading(true);
    setError(null);
    setSaved(false);
    const res = await fetch(`/api/admin/accounts/${accountId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tier2PartnerAccount: checked }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Save failed");
      return;
    }
    setSaved(true);
    router.refresh();
  }

  return (
    <Card className="bg-gray-900 border-gray-800 mb-6">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm text-gray-300">Settings</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => setChecked(e.target.checked)}
            className="rounded"
          />
          Tier 2 Partner account — requires a dedicated, Partner-eligible driver on assignment
        </label>
        {error && <p className="text-xs text-red-400">{error}</p>}
        {saved && <p className="text-xs text-green-400">Saved.</p>}
        <Button
          size="sm"
          disabled={loading || checked === tier2PartnerAccount}
          onClick={handleSave}
          className="bg-gray-700 hover:bg-gray-600"
        >
          {loading ? "Saving…" : "Save"}
        </Button>
      </CardContent>
    </Card>
  );
}
