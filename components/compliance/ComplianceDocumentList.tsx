"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { AddDocumentDialog } from "./AddDocumentDialog";
import { ReviewDocumentDialog } from "./ReviewDocumentDialog";

const statusColors: Record<string, string> = {
  verified: "bg-green-900 text-green-300 border-green-700",
  pending_review: "bg-yellow-900 text-yellow-300 border-yellow-700",
  expired: "bg-red-900 text-red-300 border-red-700",
  rejected: "bg-red-900 text-red-300 border-red-700",
};

const docTypeLabels: Record<string, string> = {
  license: "Driver License",
  insurance: "Insurance",
  registration: "Vehicle Registration",
  inspection: "Inspection Certificate",
  background_check: "Background Check",
};

interface Doc {
  id: string;
  docType: string;
  status: string;
  expiryDate: Date;
  reviewedAt: Date | null;
  notes: string | null;
}

interface Props {
  documents: Doc[];
  entityType: "driver" | "vehicle";
  entityId: string;
}

export function ComplianceDocumentList({ documents, entityType, entityId }: Props) {
  const [showAdd, setShowAdd] = useState(false);
  const [reviewing, setReviewing] = useState<Doc | null>(null);

  return (
    <div>
      <div className="space-y-2 mb-4">
        {documents.length === 0 && (
          <p className="text-sm text-gray-600 py-4 text-center">No documents uploaded</p>
        )}
        {documents.map((doc) => (
          <div
            key={doc.id}
            className="flex items-center justify-between py-3 border-b border-gray-800 last:border-0"
          >
            <div>
              <p className="text-sm text-white">{docTypeLabels[doc.docType] ?? doc.docType}</p>
              <p className="text-xs text-gray-500 mt-0.5">
                Expires {format(new Date(doc.expiryDate), "dd MMM yyyy")}
                {doc.reviewedAt && (
                  <span className="ml-2 text-gray-600">
                    · Reviewed {format(new Date(doc.reviewedAt), "dd MMM yyyy")}
                  </span>
                )}
              </p>
              {doc.notes && <p className="text-xs text-gray-500 mt-0.5 italic">{doc.notes}</p>}
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={`text-xs ${statusColors[doc.status]}`}>
                {doc.status.replace("_", " ")}
              </Badge>
              {doc.status === "pending_review" && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs border-gray-700 text-gray-300"
                  onClick={() => setReviewing(doc)}
                >
                  Review
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>

      <Button
        size="sm"
        variant="outline"
        className="border-gray-700 text-gray-300 text-xs"
        onClick={() => setShowAdd(true)}
      >
        + Upload Document
      </Button>

      <AddDocumentDialog
        open={showAdd}
        onClose={() => setShowAdd(false)}
        entityType={entityType}
        entityId={entityId}
      />

      {reviewing && (
        <ReviewDocumentDialog
          doc={reviewing}
          onClose={() => setReviewing(null)}
        />
      )}
    </div>
  );
}
