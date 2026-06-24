import { withAuth } from "@workos-inc/authkit-nextjs";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getOperatorTenant } from "@/lib/utils/operator";

export async function GET(req: Request) {
  const { user } = await withAuth({ ensureSignedIn: true });
  if (!user || await getOperatorTenant(user.id)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const status = new URL(req.url).searchParams.get("status");

  const conflicts = await prisma.claimConflict.findMany({
    where: status ? { status } : undefined,
    orderBy: { createdAt: "desc" },
    include: {
      account: { select: { id: true, name: true, uen: true } },
    },
  });

  // Enrich with existing claim + challenger tenant names
  const enriched = await Promise.all(
    conflicts.map(async (c) => {
      const [existingClaim, challengerTenant] = await Promise.all([
        prisma.accountClaim.findUnique({
          where: { id: c.existingClaimId },
          select: { id: true, status: true, claimingPartyType: true, claimingPartyId: true, wonAt: true, lastTripCompletedAt: true },
        }),
        prisma.tenant.findUnique({
          where: { id: c.challengerTenantId },
          select: { id: true, name: true },
        }),
      ]);

      let holderName: string | null = null;
      if (existingClaim?.claimingPartyType === "lypx_direct") {
        holderName = "LyPX Direct";
      } else if (existingClaim?.claimingPartyId) {
        const t = await prisma.tenant.findUnique({
          where: { id: existingClaim.claimingPartyId },
          select: { name: true },
        });
        holderName = t?.name ?? null;
      }

      return { ...c, existingClaim, challengerTenant, holderName };
    })
  );

  return NextResponse.json({ conflicts: enriched });
}
