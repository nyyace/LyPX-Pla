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

  const nextStatus = NEXT_STATUS[currentStatus];

  async function transition(status: string) {
    setLoading(true);
    setError(null);

    const res = await fetch(`/api/orders/${orderId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "Failed to update status");
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
