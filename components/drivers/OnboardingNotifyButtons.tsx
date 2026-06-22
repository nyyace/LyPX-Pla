"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle, ChevronDown, ChevronUp } from "lucide-react";

interface Props {
  driverId: string;
}

export function OnboardingNotifyButtons({ driverId }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<string | null>(null);
  const [showInfoForm, setShowInfoForm] = useState(false);
  const [infoMessage, setInfoMessage] = useState("");

  async function notify(notification: string, extra?: object) {
    setLoading(notification);
    setError(null);
    setSent(null);

    const res = await fetch(`/api/drivers/${driverId}/notify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notification, ...extra }),
    });

    const data = await res.json();
    setLoading(null);

    if (!res.ok) {
      setError(data.error ?? "Action failed");
      return;
    }

    if (notification === "approved") setSent("Driver approved and notified via WhatsApp");
    if (notification === "request_info") {
      setSent("Info request sent via WhatsApp");
      setShowInfoForm(false);
      setInfoMessage("");
    }
    if (notification === "rejected") setSent("Rejection notification sent");

    router.refresh();
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

      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          onClick={() => notify("approved")}
          disabled={!!loading}
          className="bg-green-700 hover:bg-green-600 text-xs h-7"
        >
          {loading === "approved" ? "Approving..." : "✓ Approve"}
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => { setShowInfoForm(!showInfoForm); setSent(null); }}
          disabled={!!loading}
          className="border-yellow-700 text-yellow-300 hover:bg-yellow-950 text-xs h-7"
        >
          {showInfoForm ? <ChevronUp size={12} className="mr-1" /> : <ChevronDown size={12} className="mr-1" />}
          Request More Info
        </Button>
        <Button
          size="sm"
          variant="destructive"
          onClick={() => notify("rejected")}
          disabled={!!loading}
          className="text-xs h-7"
        >
          {loading === "rejected" ? "Rejecting..." : "Reject"}
        </Button>
      </div>

      {showInfoForm && (
        <div className="space-y-2 p-3 bg-gray-800 rounded-md border border-yellow-900">
          <p className="text-xs text-gray-400">Describe what the driver needs to resubmit or clarify:</p>
          <Textarea
            value={infoMessage}
            onChange={(e) => setInfoMessage(e.target.value)}
            placeholder="e.g. Your license photo is too blurry. Please resubmit a clear photo of the front of your driving licence."
            className="bg-gray-900 border-gray-700 text-white text-xs resize-none"
            rows={3}
          />
          <Button
            size="sm"
            onClick={() => notify("request_info", { message: infoMessage })}
            disabled={!!loading || !infoMessage.trim()}
            className="bg-yellow-700 hover:bg-yellow-600 text-xs h-7"
          >
            {loading === "request_info" ? "Sending..." : "Send Request"}
          </Button>
        </div>
      )}
    </div>
  );
}
