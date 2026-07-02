import { NextResponse } from "next/server";
import { withAuth } from "@workos-inc/authkit-nextjs";
import { prisma } from "@/lib/prisma";
import { isAdminUser } from "@/lib/utils/admin";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user } = await withAuth({ ensureSignedIn: true });
  if (!user || !(await isAdminUser(user.id))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const existing = await prisma.account.findUnique({ where: { id }, select: { id: true } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => ({})) as { tier2PartnerAccount?: boolean };
  if (body.tier2PartnerAccount === undefined) {
    return NextResponse.json({ error: "tier2PartnerAccount is required" }, { status: 400 });
  }

  const account = await prisma.$transaction(async (tx) => {
    const a = await tx.account.update({
      where: { id },
      data: { tier2PartnerAccount: body.tier2PartnerAccount },
    });
    await tx.auditLog.create({
      data: {
        entityType: "account",
        entityId: id,
        action: "account.tier2_partner_updated",
        actorId: user.id,
        metadata: { tier2PartnerAccount: body.tier2PartnerAccount },
      },
    });
    return a;
  });

  return NextResponse.json({ id: account.id, tier2PartnerAccount: account.tier2PartnerAccount });
}
