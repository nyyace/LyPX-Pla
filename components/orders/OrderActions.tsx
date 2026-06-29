"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";

const NEXT_STATUS: Record<string, string | null> = {
  booked: "assigned",
  assigned: "en_route",
  en_route: "arrived",
  arrived: "started",
  started: "completed",
  completed: null,
  cancelled: null,
};

const NEXT_LABEL: Record<string, string> = {
  assigned: "Mark Assigned",
  en_route: "Mark En Route",
  arrived: "Mark Arrived",
  started: "Mark Started",
  completed: "Mark Completed",
};

interface Props {
  orderId: string;
  currentStatus: string;
  driverId: string | null;
  vehicleId: string | null;
}

export function OrderActions({ orderId, currentStatus, driverId, vehicleId }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [complianceFailures, setComplianceFailures] = useState<{ check: string; message: string }[]>([]);

  const nextStatus = NEXT_STATUS[currentStatus];

  async function transition(status: string) {
    setLoading(true);
    setError(null);
    setComplianceFailures([]);

    const res = await fetch(`/api/orders/${orderId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      if (res.status === 422 && data.failures?.length) {
        setComplianceFailures(data.failures);
      } else {
        setError(data.error ?? "Failed to update status");
      }
      return;
    }

    router.refresh();
  }

  if (!nextStatus && currentStatus !== "booked") return null;

  return (
    <div>
      {error && (
        <Alert variant="destructive" className="mb-3 border-red-800 bg-red-950">
          <AlertDescription className="text-red-300">{error}</AlertDescription>
        </Alert>
      )}
      {complianceFailures.length > 0 && (
        <div className="mb-3 p-3 bg-red-950/40 border border-red-800/50 rounded-md">
          <p className="text-xs font-semibold text-red-400 mb-2">Cannot assign — compliance issues:</p>
          <ul className="space-y-1">
            {complianceFailures.map((f, i) => (
              <li key={i} className="text-xs text-red-400 flex items-start gap-2">
                <span className="shrink-0 mt-0.5">✗</span>
                <span>{f.message}</span>
              </li>
            ))}
          </ul>
          <p className="text-xs text-gray-500 mt-2">
            Resolve these issues in the driver or vehicle compliance screen, then retry.
          </p>
        </div>
      )}
      <div className="flex gap-2 flex-wrap">
        {nextStatus && (
          <Button
            size="sm"
            onClick={() => transition(nextStatus)}
            disabled={loading}
          >
            {NEXT_LABEL[nextStatus] ?? nextStatus}
          </Button>
        )}
        {currentStatus === "booked" || currentStatus === "assigned" ? (
          <Button
            size="sm"
            variant="outline"
            className="border-red-800 text-red-400 hover:bg-red-950"
            onClick={() => transition("cancelled")}
            disabled={loading}
          >
            Cancel Order
          </Button>
        ) : null}
      </div>
    </div>
  );
}
