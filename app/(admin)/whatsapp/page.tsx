"use client";

import { useEffect, useState } from "react";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { WHATSAPP_TEMPLATES } from "@/lib/whatsapp/templates";
import { CheckCircle } from "lucide-react";
import { formatTZ, DEFAULT_TIMEZONE } from "@/lib/utils/date";

interface Order {
  id: string;
  pickupLocation: string;
  pickupTime: string;
  account: { name: string };
  driver: { firstName: string; lastName: string } | null;
}

export default function WhatsAppPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [timezone, setTimezone] = useState(DEFAULT_TIMEZONE);
  const [selectedOrderId, setSelectedOrderId] = useState("");
  const [templateKey, setTemplateKey] = useState("");
  const [to, setTo] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/orders?status=booked")
      .then((r) => r.json())
      .then(setOrders);
    fetch("/api/preferences")
      .then((r) => r.json())
      .then((d) => { if (d.timezone) setTimezone(d.timezone); });
  }, []);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    const res = await fetch("/api/whatsapp/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to, templateKey, orderId: selectedOrderId }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "Send failed");
      return;
    }

    setSuccess(`Sent — message ID: ${data.messageId}`);
  }

  return (
    <div className="p-8 max-w-lg">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-white">WhatsApp</h1>
        <p className="text-sm text-gray-500 mt-1">Manual template send via Meta Cloud API</p>
      </div>

      <Card className="bg-gray-900 border-gray-800 mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm text-gray-300">Approved Templates</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {Object.values(WHATSAPP_TEMPLATES).map((t) => (
              <div key={t.name} className="flex items-center justify-between py-1">
                <div>
                  <p className="text-sm text-white">{t.name}</p>
                  <p className="text-xs text-gray-500">{t.description}</p>
                </div>
                <span className="text-xs text-gray-600">{t.language}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive" className="mb-4 border-red-800 bg-red-950">
          <AlertDescription className="text-red-300">{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <div className="flex items-center gap-2 mb-4 text-green-400 text-sm bg-green-950 border border-green-800 rounded-md px-3 py-2">
          <CheckCircle size={14} />
          {success}
        </div>
      )}

      <form onSubmit={handleSend} className="space-y-4">
        <div className="space-y-1.5">
          <Label className="text-gray-300">Linked order (optional)</Label>
          <Select value={selectedOrderId} onValueChange={(v) => setSelectedOrderId(v ?? "")}>
            <SelectTrigger className="bg-gray-900 border-gray-700">
              <SelectValue placeholder="Select order for audit trail..." />
            </SelectTrigger>
            <SelectContent className="bg-gray-900 border-gray-700">
              {orders.map((o) => (
                <SelectItem key={o.id} value={o.id}>
                  {o.account.name} — {formatTZ(o.pickupTime, timezone)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-gray-300">Template</Label>
          <Select value={templateKey} onValueChange={(v) => setTemplateKey(v ?? "")} required>
            <SelectTrigger className="bg-gray-900 border-gray-700">
              <SelectValue placeholder="Select template..." />
            </SelectTrigger>
            <SelectContent className="bg-gray-900 border-gray-700">
              {Object.entries(WHATSAPP_TEMPLATES).map(([key, t]) => (
                <SelectItem key={key} value={key}>{t.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="to" className="text-gray-300">Recipient (E.164 format)</Label>
          <Input
            id="to"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder="+6591234567"
            required
            className="bg-gray-900 border-gray-700"
          />
        </div>

        <Button type="submit" disabled={loading || !templateKey || !to}>
          {loading ? "Sending..." : "Send Message"}
        </Button>
      </form>
    </div>
  );
}
