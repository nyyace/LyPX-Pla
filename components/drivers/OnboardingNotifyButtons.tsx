"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle } from "lucide-react";

interface Props {
  driverId: string;
}

export function OnboardingNotifyButtons({ driverId }: Props) {
  const [loading, setLoading] = useState<"approved" | "rejected" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<string | null>(null);

  async function notify(notification: "approved" | "rejected") {
    setLoading(notification);
    setError(null);
    setSent(null);

    const res = await fetch(`/api/drivers/${driverId}/notify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notification }),
    });

    const data = await res.json();
    setLoading(null);

    if (!res.ok) {
      setError(data.error ?? "Send failed");
      return;
    }

    setSent(notification === "approved" ? "Approval notification sent" : "Rejection notification sent");
  }

  return (
    <div className="space-y-3">
      {error && (
        <Alert variant="destructive" className="border-red-800 bg-red-950">
          <AlertDescription className="text-red-300 text-xs">{error}</AlertDescription>
        </Alert>
      )}
      {sent && (
        <div className="flex items-center gap-2 text-green-400 text-xs bg-green-950 border border-green-800 rounded-md px-3 py-2">
          <CheckCircle size={12} />
          {sent}
        </div>
      )}
      <div className="flex gap-2">
        <Button
          size="sm"
          onClick={() => notify("approved")}
          disabled={!!loading}
          className="bg-green-700 hover:bg-green-600 text-xs h-7"
        >
          {loading === "approved" ? "Sending..." : "Notify Approved"}
        </Button>
        <Button
          size="sm"
          variant="destructive"
          onClick={() => notify("rejected")}
          disabled={!!loading}
          className="text-xs h-7"
        >
          {loading === "rejected" ? "Sending..." : "Notify Rejected"}
        </Button>
      </div>
    </div>
  );
}
