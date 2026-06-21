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

  useEffect(() => {
    fetch("/api/drivers").then((r) => r.json()).then(setDrivers);
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const form = new FormData(e.currentTarget);

    // Create vehicle
    const vehicleRes = await fetch("/api/vehicles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        make: form.get("make"),
        model: form.get("model"),
        plateNumber: form.get("plateNumber"),
      }),
    });

    const vehicleData = await vehicleRes.json();
    setLoading(false);

    if (!vehicleRes.ok) {
      setError(vehicleData.error ?? "Failed to create vehicle");
      return;
    }

    router.push(`/vehicles/${vehicleData.id}`);
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
    </div>
  );
}
