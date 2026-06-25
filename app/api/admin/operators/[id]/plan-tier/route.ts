import { withAuth } from "@workos-inc/authkit-nextjs";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

const VALID_TIERS = ["starter", "growth", "enterprise"];
const TIER_LIMITS: Record<string, number> = {
  starter: 10,
  growth: 50,
  enterprise: 500,
};

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user } = await withAuth({ ensureSignedIn: true });
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { planTier, driverLimit } = await req.json();

  if (!VALID_TIERS.includes(planTier)) {
    return NextResponse.json({ error: "Invalid planTier" }, { status: 400 });
  }

  const tenant = await prisma.tenant.findUnique({ where: { id }, select: { id: true } });
  if (!tenant) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const effectiveLimit = typeof driverLimit === "number" && driverLimit > 0
    ? driverLimit
    : TIER_LIMITS[planTier];

  await prisma.tenant.update({
    where: { id },
    data: { planTier, driverLimit: effectiveLimit },
  });

  await prisma.auditLog.create({
    data: {
      entityType: "tenant",
      entityId: id,
      action: "plan_tier_updated",
      actorId: user.id,
      metadata: { planTier, driverLimit: effectiveLimit },
    },
  });

  return NextResponse.json({ success: true, planTier, driverLimit: effectiveLimit });
}
