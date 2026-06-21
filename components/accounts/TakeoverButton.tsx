"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { RequestTakeoverDialog } from "./RequestTakeoverDialog";

interface Props {
  accountId: string;
  currentOwnerType: string;
  currentOwnerId?: string | null;
}

export function TakeoverButton({ accountId, currentOwnerType, currentOwnerId }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        className="border-gray-700 text-gray-300 text-xs"
        onClick={() => setOpen(true)}
      >
        Request Takeover
      </Button>
      {open && (
        <RequestTakeoverDialog
          accountId={accountId}
          currentOwnerType={currentOwnerType}
          currentOwnerId={currentOwnerId}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
