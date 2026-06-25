import { withAuth } from "@workos-inc/authkit-nextjs";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getOperatorTenant } from "@/lib/utils/operator";

export async function GET() {
  const { user } = await withAuth({ ensureSignedIn: true });
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tenant = await getOperatorTenant(user.id);
  if (!tenant) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const count = await prisma.operatorDriverMembership.count({
    where: {
      tenantId: tenant.id,
      tier1Member: true,
      driver: {
        complianceStatus: { in: ["expiring_soon", "suspended"] },
      },
    },
  });

  return NextResponse.json({ count });
}
