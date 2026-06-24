import { withAuth } from "@workos-inc/authkit-nextjs";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user } = await withAuth({ ensureSignedIn: true });
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { enabled } = await req.json();
  if (typeof enabled !== "boolean") {
    return NextResponse.json({ error: "enabled must be boolean" }, { status: 400 });
  }

  const tenant = await prisma.tenant.findUnique({ where: { id }, select: { id: true } });
  if (!tenant) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.tenantPreference.upsert({
    where: { tenantId: id },
    create: { tenantId: id, whatsappEnabled: enabled },
    update: { whatsappEnabled: enabled },
  });

  await prisma.auditLog.create({
    data: {
      entityType: "tenant",
      entityId: id,
      action: enabled ? "whatsapp_access_granted" : "whatsapp_access_revoked",
      actorId: user.id,
      metadata: {},
    },
  });

  return NextResponse.json({ success: true });
}
