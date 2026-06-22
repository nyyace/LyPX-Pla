"use client";

import { useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ReviewDocumentDialog } from "./ReviewDocumentDialog";
import { formatTZDate, isExpired, DEFAULT_TIMEZONE } from "@/lib/utils/date";

interface Doc {
  id: string;
  docType: string;
  status: string;
  expiryDate: Date;
  entityType: string;
  reviewedAt: Date | null;
  driver: { id: string; firstName: string; lastName: string } | null;
  vehicle: { id: string; plateNumber: string; make?: string; model?: string } | null;
}

interface Props {
  docs: Doc[];
  section: "pending" | "expired";
  timezone?: string;
}

const docTypeLabels: Record<string, string> = {
  license: "Driver License",
  insurance: "Insurance",
  registration: "Vehicle Registration",
  inspection: "Inspection Certificate",
  background_check: "Background Check",
};

export function ComplianceQueueTable({ docs, section, timezone = DEFAULT_TIMEZONE }: Props) {
  const [reviewing, setReviewing] = useState<Doc | null>(null);

  if (docs.length === 0) {
    return (
      <p className="text-sm text-gray-600 py-6 text-center border border-gray-800 rounded-md">
        {section === "pending" ? "No documents pending review" : "No expired documents"}
      </p>
    );
  }

  return (
    <>
      <div className="rounded-md border border-gray-800 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-gray-800 hover:bg-transparent">
              <TableHead className="text-gray-400">Entity</TableHead>
              <TableHead className="text-gray-400">Document</TableHead>
              <TableHead className="text-gray-400">Expiry</TableHead>
              <TableHead className="text-gray-400">Uploaded</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {docs.map((doc) => {
              const entityLabel = doc.driver
                ? `${doc.driver.firstName} ${doc.driver.lastName}`
                : doc.vehicle
                ? `${doc.vehicle.plateNumber}`
                : "Unknown";
              const entityHref = doc.driver
                ? `/drivers/${doc.driver.id}`
                : doc.vehicle
                ? `/vehicles/${doc.vehicle.id}`
                : "#";

              return (
                <TableRow key={doc.id} className="border-gray-800 hover:bg-gray-900">
                  <TableCell>
                    <div>
                      <Link href={entityHref} className="text-sm text-white hover:underline">
                        {entityLabel}
                      </Link>
                      <p className="text-xs text-gray-500">{doc.entityType}</p>
                    </div>
                  </TableCell>
                  <TableCell className="text-gray-300 text-sm">
                    {docTypeLabels[doc.docType] ?? doc.docType}
                  </TableCell>
                  <TableCell className="text-sm">
                    <span className={isExpired(doc.expiryDate) ? "text-red-400" : "text-gray-300"}>
                      {formatTZDate(doc.expiryDate, timezone)}
                    </span>
                  </TableCell>
                  <TableCell className="text-gray-500 text-xs">
                    {formatTZDate(doc.reviewedAt ?? doc.expiryDate, timezone)}
                  </TableCell>
                  <TableCell className="text-right">
                    {section === "pending" && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs border-gray-700 text-gray-300"
                        onClick={() => setReviewing(doc)}
                      >
                        Review
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {reviewing && (
        <ReviewDocumentDialog doc={reviewing} onClose={() => setReviewing(null)} timezone={timezone} />
      )}
    </>
  );
}
