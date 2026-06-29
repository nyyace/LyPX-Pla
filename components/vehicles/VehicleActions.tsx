"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface Props {
  vehicleId: string;
}

export function VehicleActions({ vehicleId }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function removeVehicle() {
    if (!confirm("Remove this vehicle? This cannot be undone from the UI.")) return;

    setLoading(true);
    setError(null);

    const res = await fetch(`/api/admin/vehicles/${vehicleId}`, { method: "DELETE" });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "Failed to remove vehicle");
      return;
    }

    router.push("/vehicles");
  }

  return (
    <div>
      {error && (
        <Alert variant="destructive" className="mb-3 border-red-800 bg-red-950">
          <AlertDescription className="text-red-300">{error}</AlertDescription>
        </Alert>
      )}
      <Button
        size="sm"
        variant="outline"
        className="border-red-900 text-red-400 text-xs hover:bg-red-950"
        onClick={removeVehicle}
        disabled={loading}
      >
        Remove Vehicle
      </Button>
    </div>
  );
}
