import { withAuth } from "@workos-inc/authkit-nextjs";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getOperatorTenant } from "@/lib/utils/operator";

export async function GET() {
  const { user } = await withAuth({ ensureSignedIn: true });
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tenant = await getOperatorTenant(user.id);
  if (!tenant) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  if (!tenant.preference?.whatsappEnabled) {
    return NextResponse.json({ count: 0 });
  }

  const count = await prisma.whatsAppMessage.count({
    where: { tenantId: tenant.id, direction: "inbound", isRead: false },
  });

  return NextResponse.json({ count });
}
