import { NextResponse } from "next/server";
import { withAuth } from "@workos-inc/authkit-nextjs";
import { prisma, type TxClient } from "@/lib/prisma";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") ?? "pending";

  const requests = await prisma.takeoverRequest.findMany({
    where: { status },
    orderBy: { requestedAt: "desc" },
    include: { account: { select: { name: true, customerSegment: true } } },
  });

  return NextResponse.json(requests);
}

export async function POST(req: Request) {
  const { user } = await withAuth({ ensureSignedIn: true });
  const body = await req.json();
  const {
    accountId,
    currentOwnerType,
    currentOwnerId,
    requestingPartyType,
    requestingPartyId,
  } = body;

  if (!accountId || !currentOwnerType || !requestingPartyType) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const request = await prisma.$transaction(async (tx: TxClient) => {
    const r = await tx.takeoverRequest.create({
      data: {
        accountId,
        currentOwnerType,
        currentOwnerId: currentOwnerId ?? null,
        requestingPartyType,
        requestingPartyId: requestingPartyId ?? null,
        status: "pending",
      },
    });

    await tx.auditLog.create({
      data: {
        entityType: "takeover_request",
        entityId: r.id,
        action: "takeover_requested",
        actorId: user.id,
        metadata: { accountId, currentOwnerType, requestingPartyType },
      },
    });

    return r;
  });

  return NextResponse.json(request, { status: 201 });
}
