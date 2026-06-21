import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import { TakeoverScorecardForm } from "@/components/TakeoverScorecardForm";
import { SCORECARD_CRITERIA } from "@/app/api/takeover-requests/[id]/route";

export default async function TakeoverRequestDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const { id } = await params;
  const request = await prisma.takeoverRequest.findUnique({
    where: { id },
    include: { account: true },
  });

  if (!request) notFound();

  const scoreBreakdown = (request.scoreBreakdown as Record<string, number> | null) ?? {};

  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-6">
        <Link href="/takeover-requests" className="text-xs text-gray-500 hover:text-gray-300 mb-3 block">
          ← Takeover Requests
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-white">Takeover Request</h1>
            <p className="text-sm text-gray-500 mt-1">{request.account.name}</p>
          </div>
          <Badge
            variant="outline"
            className={`${
              request.status === "approved" ? "border-green-700 text-green-300" :
              request.status === "denied" ? "border-red-700 text-red-300" :
              request.status === "conditional" ? "border-blue-700 text-blue-300" :
              "border-yellow-700 text-yellow-300"
            }`}
          >
            {request.status}
          </Badge>
        </div>
      </div>

      <Card className="bg-gray-900 border-gray-800 mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm text-gray-300">Request Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">Requesting party</span>
            <span className="text-white">{request.requestingPartyType}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Current owner</span>
            <span className="text-white">{request.currentOwnerType}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Requested</span>
            <span className="text-white">{format(new Date(request.requestedAt), "dd MMM yyyy")}</span>
          </div>
          {request.score != null && (
            <div className="flex justify-between">
              <span className="text-gray-500">Total score</span>
              <span className="text-white font-medium">{request.score} / 100</span>
            </div>
          )}
          {request.rightToRespondInvoked && (
            <div className="flex justify-between">
              <span className="text-gray-500">Right to respond deadline</span>
              <span className="text-yellow-300">
                {request.rightToRespondDeadline
                  ? format(new Date(request.rightToRespondDeadline), "dd MMM yyyy")
                  : "—"}
              </span>
            </div>
          )}
          {request.decisionNotes && (
            <div className="pt-2 border-t border-gray-800">
              <span className="text-gray-500 block mb-1">Decision notes</span>
              <p className="text-white">{request.decisionNotes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Scorecard & Decision (active when pending/conditional) */}
      {(request.status === "pending" || request.status === "conditional") && (
        <TakeoverScorecardForm
          requestId={request.id}
          criteria={SCORECARD_CRITERIA}
          existingBreakdown={scoreBreakdown}
          rightToRespondInvoked={request.rightToRespondInvoked}
        />
      )}
    </div>
  );
}
