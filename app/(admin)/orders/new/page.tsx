"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface Account { id: string; name: string; }
interface Driver { id: string; firstName: string; lastName: string; complianceStatus: string; }
interface Vehicle { id: string; plateNumber: string; make: string; model: string; status: string; }

export default function NewOrderPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);

  useEffect(() => {
    Promise.all([
      fetch("/api/accounts").then((r) => r.json()),
      fetch("/api/drivers?status=active").then((r) => r.json()),
      fetch("/api/vehicles?status=active").then((r) => r.json()),
    ]).then(([a, d, v]) => {
      setAccounts(a);
      setDrivers(d);
      setVehicles(v);
    });
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        accountId: form.get("accountId"),
        tenantId: "lypx_direct",
        pickupTime: form.get("pickupTime"),
        pickupLocation: form.get("pickupLocation"),
        dropoffLocation: form.get("dropoffLocation"),
        driverId: form.get("driverId") || null,
        vehicleId: form.get("vehicleId") || null,
        notes: form.get("notes") || null,
      }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "Failed to create order");
      return;
    }

    router.push(`/orders/${data.id}`);
  }

  return (
    <div className="p-8 max-w-lg">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-white">New Order</h1>
        <p className="text-sm text-gray-500 mt-1">Manual trip entry</p>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-4 border-red-800 bg-red-950">
          <AlertDescription className="text-red-300">{error}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label className="text-gray-300">Account</Label>
          <Select name="accountId" required>
            <SelectTrigger className="bg-gray-900 border-gray-700">
              <SelectValue placeholder="Select account..." />
            </SelectTrigger>
            <SelectContent className="bg-gray-900 border-gray-700">
              {accounts.map((a) => (
                <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="pickupTime" className="text-gray-300">Pickup time</Label>
          <Input
            id="pickupTime"
            name="pickupTime"
            type="datetime-local"
            required
            className="bg-gray-900 border-gray-700"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="pickupLocation" className="text-gray-300">Pickup location</Label>
          <Input id="pickupLocation" name="pickupLocation" required className="bg-gray-900 border-gray-700" />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="dropoffLocation" className="text-gray-300">Drop-off location</Label>
          <Input id="dropoffLocation" name="dropoffLocation" required className="bg-gray-900 border-gray-700" />
        </div>

        <div className="space-y-1.5">
          <Label className="text-gray-300">Assign driver (optional)</Label>
          <Select name="driverId">
            <SelectTrigger className="bg-gray-900 border-gray-700">
              <SelectValue placeholder="Select active driver..." />
            </SelectTrigger>
            <SelectContent className="bg-gray-900 border-gray-700">
              {drivers.map((d) => (
                <SelectItem key={d.id} value={d.id}>
                  {d.firstName} {d.lastName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-gray-300">Assign vehicle (optional)</Label>
          <Select name="vehicleId">
            <SelectTrigger className="bg-gray-900 border-gray-700">
              <SelectValue placeholder="Select active vehicle..." />
            </SelectTrigger>
            <SelectContent className="bg-gray-900 border-gray-700">
              {vehicles.map((v) => (
                <SelectItem key={v.id} value={v.id}>
                  {v.plateNumber} — {v.make} {v.model}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="notes" className="text-gray-300">Notes</Label>
          <Textarea
            id="notes"
            name="notes"
            className="bg-gray-900 border-gray-700 text-white resize-none"
            rows={3}
          />
        </div>

        <div className="flex gap-3 pt-2">
          <Button type="submit" disabled={loading}>
            {loading ? "Creating..." : "Create Order"}
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
