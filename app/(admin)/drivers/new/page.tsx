"use client";

import { useState } from "react";
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

export default function NewDriverPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const form = new FormData(e.currentTarget);
    const body = {
      firstName: form.get("firstName"),
      lastName: form.get("lastName"),
      phoneNumber: form.get("phoneNumber"),
      licenseNumber: form.get("licenseNumber"),
      nationalId: form.get("nationalId"),
      relationshipType: form.get("relationshipType"),
    };

    const res = await fetch("/api/drivers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "Failed to create driver");
      return;
    }

    router.push(`/drivers/${data.id}`);
  }

  return (
    <div className="p-8 max-w-lg">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-white">Add Driver</h1>
        <p className="text-sm text-gray-500 mt-1">
          Creates a deduped registry entry using license number + national ID
        </p>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-4 border-red-800 bg-red-950">
          <AlertDescription className="text-red-300">{error}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="firstName" className="text-gray-300">First name</Label>
            <Input id="firstName" name="firstName" required className="bg-gray-900 border-gray-700" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="lastName" className="text-gray-300">Last name</Label>
            <Input id="lastName" name="lastName" required className="bg-gray-900 border-gray-700" />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="phoneNumber" className="text-gray-300">Phone number</Label>
          <Input
            id="phoneNumber"
            name="phoneNumber"
            placeholder="+6591234567"
            required
            className="bg-gray-900 border-gray-700"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="licenseNumber" className="text-gray-300">Driver license number</Label>
          <Input
            id="licenseNumber"
            name="licenseNumber"
            required
            className="bg-gray-900 border-gray-700"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="nationalId" className="text-gray-300">National ID (NRIC/FIN)</Label>
          <Input
            id="nationalId"
            name="nationalId"
            required
            className="bg-gray-900 border-gray-700"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="relationshipType" className="text-gray-300">Relationship type</Label>
          <Select name="relationshipType" defaultValue="contracted">
            <SelectTrigger className="bg-gray-900 border-gray-700">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-gray-900 border-gray-700">
              <SelectItem value="employed">Employed</SelectItem>
              <SelectItem value="contracted">Contracted</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex gap-3 pt-2">
          <Button type="submit" disabled={loading}>
            {loading ? "Creating..." : "Create Driver"}
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
