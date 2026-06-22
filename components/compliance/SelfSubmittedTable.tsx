"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatTZDate, DEFAULT_TIMEZONE } from "@/lib/utils/date";

const docTypeLabels: Record<string, string> = {
  license: "License",
  insurance: "Insurance",
  registration: "Registration",
  inspection: "Inspection",
  background_check: "BG Check",
};

interface Doc {
  id: string;
  docType: string;
  expiryDate: Date;
  status: string;
}

interface Driver {
  id: string;
  firstName: string;
  lastName: string;
  complianceStatus: string;
  createdAt: Date;
  documents: Doc[];
  _count: { documents: number };
}

interface Props {
  drivers: Driver[];
  timezone?: string;
}

export function SelfSubmittedTable({ drivers, timezone = DEFAULT_TIMEZONE }: Props) {
  if (drivers.length === 0) return null;

  return (
    <div className="rounded-md border border-purple-900 overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="border-purple-900 hover:bg-transparent bg-purple-950/30">
            <TableHead className="text-purple-400">Applicant</TableHead>
            <TableHead className="text-purple-400">Documents pending</TableHead>
            <TableHead className="text-purple-400">Applied</TableHead>
            <TableHead className="text-purple-400">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {drivers.map((d) => (
            <TableRow key={d.id} className="border-purple-900/50 hover:bg-gray-900">
              <TableCell>
                <Link href={`/drivers/${d.id}`} className="text-white hover:underline text-sm">
                  {d.firstName} {d.lastName}
                </Link>
              </TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-1">
                  {d.documents.map((doc) => (
                    <Badge
                      key={doc.id}
                      variant="outline"
                      className="text-xs border-yellow-700 text-yellow-300"
                    >
                      {docTypeLabels[doc.docType] ?? doc.docType}
                    </Badge>
                  ))}
                  {d.documents.length === 0 && (
                    <span className="text-xs text-gray-600">None pending</span>
                  )}
                </div>
              </TableCell>
              <TableCell className="text-gray-500 text-xs">
                {formatTZDate(d.createdAt, timezone)}
              </TableCell>
              <TableCell>
                <Badge variant="outline" className="text-xs border-gray-700 text-gray-400">
                  {d.complianceStatus}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
