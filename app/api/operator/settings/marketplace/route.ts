import { withAuth } from "@workos-inc/authkit-nextjs";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getOperatorTenant } from "@/lib/utils/operator";

export async function PATCH(req: Request) {
  const { user } = await withAuth({ ensureSignedIn: true });
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tenant = await getOperatorTenant(user.id);
  if (!tenant) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { marketplaceParticipation } = await req.json() as { marketplaceParticipation: boolean };
  if (typeof marketplaceParticipation !== "boolean") {
    return NextResponse.json({ error: "marketplaceParticipation must be a boolean" }, { status: 400 });
  }

  const updated = await prisma.$transaction(async (tx) => {
    const t = await tx.tenant.update({
      where: { id: tenant.id },
      data: { marketplaceParticipation },
    });
    await tx.auditLog.create({
      data: {
        entityType: "tenant",
        entityId: tenant.id,
        action: marketplaceParticipation ? "marketplace_opted_in" : "marketplace_opted_out",
        actorId: user.id,
        metadata: { marketplaceParticipation },
      },
    });
    return t;
  });

  return NextResponse.json({ marketplaceParticipation: updated.marketplaceParticipation });
}
