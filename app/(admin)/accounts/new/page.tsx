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

export default function NewAccountPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/accounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.get("name"),
        customerSegment: form.get("customerSegment"),
        sourceType: form.get("sourceType"),
        claimingPartyType: form.get("sourceType") === "lypx_sourced" ? "lypx_direct" : "operator",
      }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "Failed to create account");
      return;
    }

    router.push(`/accounts/${data.id}`);
  }

  return (
    <div className="p-8 max-w-lg">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-white">Add Account</h1>
        <p className="text-sm text-gray-500 mt-1">A 90-day claim will be automatically created</p>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-4 border-red-800 bg-red-950">
          <AlertDescription className="text-red-300">{error}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="name" className="text-gray-300">Account name</Label>
          <Input id="name" name="name" required className="bg-gray-900 border-gray-700" />
        </div>

        <div className="space-y-1.5">
          <Label className="text-gray-300">Customer segment</Label>
          <Select name="customerSegment" required>
            <SelectTrigger className="bg-gray-900 border-gray-700">
              <SelectValue placeholder="Select segment..." />
            </SelectTrigger>
            <SelectContent className="bg-gray-900 border-gray-700">
              <SelectItem value="hotel">Hotel</SelectItem>
              <SelectItem value="mice">MICE</SelectItem>
              <SelectItem value="tdm">TDM</SelectItem>
              <SelectItem value="dmc">DMC</SelectItem>
              <SelectItem value="corporate_general">Corporate General</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-gray-300">Source</Label>
          <Select name="sourceType" required>
            <SelectTrigger className="bg-gray-900 border-gray-700">
              <SelectValue placeholder="Select source..." />
            </SelectTrigger>
            <SelectContent className="bg-gray-900 border-gray-700">
              <SelectItem value="lypx_sourced">LyPX Direct</SelectItem>
              <SelectItem value="operator_sourced">Operator Sourced</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex gap-3 pt-2">
          <Button type="submit" disabled={loading}>
            {loading ? "Creating..." : "Create Account"}
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
