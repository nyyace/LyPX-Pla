"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface Props {
  driverId: string;
  tier2Qualified: boolean;
}

export function DriverActions({ driverId, tier2Qualified }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggleTier2() {
    setLoading(true);
    setError(null);

    const res = await fetch(`/api/drivers/${driverId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tier2Qualified: !tier2Qualified }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "Failed to update driver");
      return;
    }

    router.refresh();
  }

  async function reEvaluateCompliance() {
    setLoading(true);
    setError(null);

    const res = await fetch(`/api/drivers/${driverId}/evaluate-compliance`, {
      method: "POST",
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "Failed to evaluate compliance");
      return;
    }

    router.refresh();
  }

  async function removeDriver() {
    if (!confirm("Remove this driver? This cannot be undone from the UI.")) return;

    setLoading(true);
    setError(null);

    const res = await fetch(`/api/admin/drivers/${driverId}`, { method: "DELETE" });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "Failed to remove driver");
      return;
    }

    router.push("/drivers");
  }

  return (
    <div>
      {error && (
        <Alert variant="destructive" className="mb-3 border-red-800 bg-red-950">
          <AlertDescription className="text-red-300">{error}</AlertDescription>
        </Alert>
      )}
      <div className="flex gap-2">
        <Button
          size="sm"
          variant="outline"
          className="border-gray-700 text-gray-300 text-xs"
          onClick={toggleTier2}
          disabled={loading}
        >
          {tier2Qualified ? "Revoke Tier 2" : "Grant Tier 2"}
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="border-gray-700 text-gray-300 text-xs"
          onClick={reEvaluateCompliance}
          disabled={loading}
        >
          Re-evaluate Compliance
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="border-red-900 text-red-400 text-xs hover:bg-red-950"
          onClick={removeDriver}
          disabled={loading}
        >
          Remove Driver
        </Button>
      </div>
    </div>
  );
}
