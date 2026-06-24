import { withAuth } from "@workos-inc/authkit-nextjs";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const { user } = await withAuth({ ensureSignedIn: true });
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const requests = await prisma.driverInviteRequest.findMany({
    where: { status: { in: ["pending", "approved", "sent"] } },
    include: {
      tenant: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(
    requests.map((r) => ({
      id: r.id,
      tenantId: r.tenantId,
      tenantName: r.tenant.name,
      driverWhatsapp: r.driverWhatsapp,
      driverName: r.driverName,
      status: r.status,
      adminNote: r.adminNote,
      createdAt: r.createdAt.toISOString(),
      sentAt: r.sentAt?.toISOString() ?? null,
      expiresAt: r.expiresAt?.toISOString() ?? null,
    }))
  );
}
