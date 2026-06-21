"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface Criterion {
  key: string;
  label: string;
  maxScore: number;
}

interface Props {
  requestId: string;
  criteria: readonly Criterion[];
  existingBreakdown: Record<string, number>;
  rightToRespondInvoked: boolean;
}

export function TakeoverScorecardForm({
  requestId,
  criteria,
  existingBreakdown,
  rightToRespondInvoked,
}: Props) {
  const router = useRouter();
  const [scores, setScores] = useState<Record<string, string>>(
    Object.fromEntries(
      criteria.map((c) => [c.key, String(existingBreakdown[c.key] ?? 0)])
    )
  );
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const total = criteria.reduce((sum, c) => sum + Math.min(Number(scores[c.key] || 0), c.maxScore), 0);

  async function submitDecision(status: "approved" | "denied" | "conditional") {
    setLoading(true);
    setError(null);

    const scoreBreakdown = Object.fromEntries(
      criteria.map((c) => [c.key, Math.min(Number(scores[c.key] || 0), c.maxScore)])
    );

    const res = await fetch(`/api/takeover-requests/${requestId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scoreBreakdown, status, decisionNotes: notes }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "Failed to submit");
      return;
    }

    router.refresh();
  }

  async function invokeRightToRespond() {
    setLoading(true);
    const res = await fetch(`/api/takeover-requests/${requestId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rightToRespondInvoked: true }),
    });
    setLoading(false);
    if (res.ok) router.refresh();
  }

  return (
    <Card className="bg-gray-900 border-gray-800">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm text-gray-300">Scorecard</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive" className="border-red-800 bg-red-950">
            <AlertDescription className="text-red-300">{error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-3">
          {criteria.map((c) => (
            <div key={c.key} className="flex items-center gap-4">
              <Label className="text-gray-300 text-sm flex-1">{c.label}</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={0}
                  max={c.maxScore}
                  value={scores[c.key]}
                  onChange={(e) => setScores((prev) => ({ ...prev, [c.key]: e.target.value }))}
                  className="bg-gray-800 border-gray-700 w-20 text-right text-sm"
                />
                <span className="text-gray-600 text-xs w-14">/ {c.maxScore}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-between items-center py-3 border-t border-gray-800">
          <span className="text-sm text-gray-400">Total</span>
          <span className="text-lg font-semibold text-white">{total} / 100</span>
        </div>

        <div className="space-y-1.5">
          <Label className="text-gray-300 text-sm">Decision notes</Label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Rubric rationale, conditions, or denial reason..."
            className="bg-gray-800 border-gray-700 text-white text-sm resize-none"
            rows={3}
          />
        </div>

        <div className="flex flex-wrap gap-2 pt-1">
          <Button
            onClick={() => submitDecision("approved")}
            disabled={loading}
            size="sm"
            className="bg-green-700 hover:bg-green-600"
          >
            Approve
          </Button>
          <Button
            onClick={() => submitDecision("conditional")}
            disabled={loading}
            size="sm"
            variant="outline"
            className="border-blue-700 text-blue-300"
          >
            Conditional
          </Button>
          <Button
            onClick={() => submitDecision("denied")}
            disabled={loading}
            size="sm"
            variant="destructive"
          >
            Deny
          </Button>
          {!rightToRespondInvoked && (
            <Button
              onClick={invokeRightToRespond}
              disabled={loading}
              size="sm"
              variant="outline"
              className="border-gray-700 text-gray-300 ml-auto"
            >
              Invoke Right to Respond
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
