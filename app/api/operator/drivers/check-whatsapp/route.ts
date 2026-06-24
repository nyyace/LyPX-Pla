import { withAuth } from "@workos-inc/authkit-nextjs";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getOperatorTenant } from "@/lib/utils/operator";

function normalizePhone(raw: string): string {
  let cleaned = raw.replace(/[\s\-()]/g, "");
  if (!cleaned.startsWith("+")) cleaned = "+" + cleaned;
  return cleaned;
}

export async function GET(req: Request) {
  const { user } = await withAuth({ ensureSignedIn: true });
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tenant = await getOperatorTenant(user.id);
  if (!tenant) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const raw = new URL(req.url).searchParams.get("number")?.trim();
  if (!raw) return NextResponse.json({ error: "number param required" }, { status: 400 });

  const normalized = normalizePhone(raw);

  const driver = await prisma.driver.findFirst({
    where: { phoneNumber: normalized },
    select: {
      complianceStatus: true,
      firstName: true,
      lastName: true,
      tier2Qualified: true,
    },
  });

  if (!driver) {
    return NextResponse.json({ status: "not_found" });
  }

  const statusMap: Record<string, string> = {
    active: "found_active",
    suspended: "found_suspended",
    expiring_soon: "found_active",
    pending: "found_pending",
    pending_review: "found_pending",
  };

  const status = statusMap[driver.complianceStatus] ?? "found_pending";

  return NextResponse.json({
    status,
    driver: {
      firstName: driver.firstName,
      lastName: driver.lastName,
      tier2Qualified: driver.tier2Qualified,
    },
  });
}
