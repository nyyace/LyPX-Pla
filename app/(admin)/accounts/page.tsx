import { prisma } from "@/lib/prisma";
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
import { Plus } from "lucide-react";

const segmentLabels: Record<string, string> = {
  hotel: "Hotel",
  mice: "MICE",
  tdm: "TDM",
  dmc: "DMC",
  corporate_general: "Corporate",
};

export default async function AccountsPage() {
  const accounts = await prisma.account.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      claims: {
        where: { status: { in: ["claimed", "won"] } },
        orderBy: { claimedAt: "desc" },
        take: 1,
      },
      _count: { select: { orders: true } },
    },
  });

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-white">Accounts</h1>
          <p className="text-sm text-gray-500 mt-1">Corporate client accounts</p>
        </div>
        <Link href="/accounts/new">
          <Button size="sm" className="gap-1.5">
            <Plus size={14} />
            Add Account
          </Button>
        </Link>
      </div>

      <div className="rounded-md border border-gray-800 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-gray-800 hover:bg-transparent">
              <TableHead className="text-gray-400">Name</TableHead>
              <TableHead className="text-gray-400">Segment</TableHead>
              <TableHead className="text-gray-400">Source</TableHead>
              <TableHead className="text-gray-400">Claim Status</TableHead>
              <TableHead className="text-gray-400">Protection</TableHead>
              <TableHead className="text-gray-400">Trips</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {accounts.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-gray-600 py-12">
                  No accounts yet
                </TableCell>
              </TableRow>
            )}
            {accounts.map((a) => {
              const claim = a.claims[0];
              return (
                <TableRow key={a.id} className="border-gray-800 hover:bg-gray-900">
                  <TableCell>
                    <Link href={`/accounts/${a.id}`} className="text-white hover:underline text-sm">
                      {a.name}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs border-gray-700 text-gray-300">
                      {segmentLabels[a.customerSegment] ?? a.customerSegment}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-gray-400 text-sm">
                    {a.sourceType === "lypx_sourced" ? "LyPX" : "Operator"}
                  </TableCell>
                  <TableCell>
                    {claim ? (
                      <Badge
                        variant="outline"
                        className={`text-xs ${
                          claim.status === "won"
                            ? "border-green-700 text-green-300"
                            : "border-yellow-700 text-yellow-300"
                        }`}
                      >
                        {claim.status}
                      </Badge>
                    ) : (
                      <span className="text-gray-600 text-xs">unclaimed</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {claim?.protectionTier === "long_term" ? (
                      <Badge variant="outline" className="text-xs border-blue-700 text-blue-300">
                        Long-term
                      </Badge>
                    ) : (
                      <span className="text-gray-600 text-xs">standard</span>
                    )}
                  </TableCell>
                  <TableCell className="text-gray-400 text-sm">{a._count.orders}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
