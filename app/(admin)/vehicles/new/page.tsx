"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface Driver { id: string; firstName: string; lastName: string; }

export default function NewVehiclePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [reactivateVehicleId, setReactivateVehicleId] = useState<string | null>(null);
  const [reactivating, setReactivating] = useState(false);
  const [lastSubmitted, setLastSubmitted] = useState<{ make: string; model: string } | null>(null);

  useEffect(() => {
    fetch("/api/drivers").then((r) => r.json()).then(setDrivers);
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setReactivateVehicleId(null);

    const form = new FormData(e.currentTarget);
    const make = form.get("make") as string;
    const model = form.get("model") as string;

    // Create vehicle
    const vehicleRes = await fetch("/api/vehicles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        make,
        model,
        plateNumber: form.get("plateNumber"),
      }),
    });

    const vehicleData = await vehicleRes.json();
    setLoading(false);

    if (!vehicleRes.ok) {
      if (vehicleData.reactivatable && vehicleData.vehicleId) {
        setReactivateVehicleId(vehicleData.vehicleId);
        setLastSubmitted({ make, model });
        return;
      }
      setError(vehicleData.error ?? "Failed to create vehicle");
      return;
    }

    router.push(`/vehicles/${vehicleData.id}`);
  }

  async function handleReactivate() {
    if (!reactivateVehicleId) return;
    setReactivating(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/vehicles/${reactivateVehicleId}/reactivate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(lastSubmitted ?? {}),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to reactivate vehicle");
        return;
      }
      router.push(`/vehicles/${data.id}`);
    } catch {
      setError("Unexpected error — please try again");
    } finally {
      setReactivating(false);
    }
  }

  return (
    <div className="p-8 max-w-lg">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-white">Add Vehicle</h1>
        <p className="text-sm text-gray-500 mt-1">Plate number must be unique in the registry</p>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-4 border-red-800 bg-red-950">
          <AlertDescription className="text-red-300">{error}</AlertDescription>
        </Alert>
      )}

      {reactivateVehicleId ? (
        <div style={{
          background: "rgba(212, 160, 23, 0.08)",
          border: "1px solid rgba(212, 160, 23, 0.3)",
          borderRadius: 8,
          padding: "20px 24px",
        }}>
          <p className="text-sm font-semibold mb-1" style={{ color: "var(--gold)" }}>
            This vehicle was previously removed
          </p>
          <p className="text-gray-400 text-sm mb-4">
            A vehicle with this plate number already exists but was removed from the platform.
            Reactivating preserves its compliance document history and audit trail — it will need
            fresh document verification before going active again. No previous driver bond is restored.
          </p>
          <div className="flex gap-3">
            <Button size="sm" disabled={reactivating} onClick={handleReactivate}>
              {reactivating ? "Reactivating…" : "Reactivate This Vehicle"}
            </Button>
            <Button size="sm" variant="outline" className="border-gray-700 text-gray-300"
              onClick={() => setReactivateVehicleId(null)}>
              Use Different Plate
            </Button>
          </div>
        </div>
      ) : (
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="plateNumber" className="text-gray-300">Plate number</Label>
          <Input
            id="plateNumber"
            name="plateNumber"
            required
            placeholder="SBA1234A"
            className="bg-gray-900 border-gray-700 uppercase"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="make" className="text-gray-300">Make</Label>
            <Input id="make" name="make" required placeholder="Mercedes-Benz" className="bg-gray-900 border-gray-700" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="model" className="text-gray-300">Model</Label>
            <Input id="model" name="model" required placeholder="E-Class" className="bg-gray-900 border-gray-700" />
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <Button type="submit" disabled={loading}>
            {loading ? "Creating..." : "Create Vehicle"}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="border-gray-700 text-gray-300"
            onClick={() => router.back()}
          >
            Cancel
          </Button>
        </div>
      </form>
      )}
    </div>
  );
}
