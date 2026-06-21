import { NextResponse } from "next/server";
import { prisma, type TxClient } from "@/lib/prisma";
import { createInitialClaim } from "@/lib/claims/engine";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q");
  const segment = searchParams.get("segment");

  const accounts = await prisma.account.findMany({
    where: {
      ...(segment ? { customerSegment: segment } : {}),
      ...(q ? { name: { contains: q, mode: "insensitive" } } : {}),
    },
    orderBy: { createdAt: "desc" },
    include: {
      claims: { where: { status: { in: ["claimed", "won"] } }, take: 1 },
      _count: { select: { orders: true } },
    },
  });

  return NextResponse.json(accounts);
}

export async function POST(req: Request) {
  const body = await req.json();
  const { name, customerSegment, sourceType, claimingPartyType, claimingPartyId } = body;

  if (!name || !customerSegment || !sourceType) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const account = await prisma.$transaction(async (tx: TxClient) => {
    const a = await tx.account.create({
      data: { name: name.trim(), customerSegment, sourceType },
    });

    await tx.auditLog.create({
      data: {
        entityType: "account_claim",
        entityId: a.id,
        action: "account_created",
        actorId: "admin",
        metadata: { name, customerSegment, sourceType },
      },
    });

    return a;
  });

  await createInitialClaim({
    accountId: account.id,
    claimingPartyType: claimingPartyType ?? (sourceType === "lypx_sourced" ? "lypx_direct" : "operator"),
    claimingPartyId: claimingPartyId ?? undefined,
  });

  return NextResponse.json(account, { status: 201 });
}
