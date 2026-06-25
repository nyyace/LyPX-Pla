"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { SUPPORTED_TIMEZONES } from "@/lib/utils/date";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle } from "lucide-react";

interface Props {
  currentTimezone: string;
}

export function TimezoneSelector({ currentTimezone }: Props) {
  const router = useRouter();
  const [timezone, setTimezone] = useState(currentTimezone);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (saved) {
      const t = setTimeout(() => setSaved(false), 3000);
      return () => clearTimeout(t);
    }
  }, [saved]);

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSaved(false);

    const res = await fetch("/api/preferences", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ timezone }),
    });

    const data = await res.json();
    setSaving(false);

    if (!res.ok) {
      setError(data.error ?? "Failed to save");
      return;
    }

    setSaved(true);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <p className="text-xs text-gray-500">
          All timestamps in the Admin Console will display in this timezone.
          Dates are stored in UTC — only the display changes.
        </p>
        <Select value={timezone} onValueChange={(v) => { setTimezone(v ?? currentTimezone); setSaved(false); }}>
          <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-gray-800 border-gray-700 w-full min-w-[var(--radix-select-trigger-width)]">
            {SUPPORTED_TIMEZONES.map((tz) => (
              <SelectItem key={tz.value} value={tz.value} className="text-white">
                {tz.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {error && (
        <Alert variant="destructive" className="border-red-800 bg-red-950">
          <AlertDescription className="text-red-300">{error}</AlertDescription>
        </Alert>
      )}

      {saved && (
        <div className="flex items-center gap-2 text-green-400 text-sm bg-green-950 border border-green-800 rounded-md px-3 py-2">
          <CheckCircle size={14} />
          Timezone saved
        </div>
      )}

      <Button
        onClick={handleSave}
        disabled={saving || timezone === currentTimezone}
        size="sm"
      >
        {saving ? "Saving..." : "Save"}
      </Button>
    </div>
  );
}
