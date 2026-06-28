import { withAuth } from "@workos-inc/authkit-nextjs";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getOperatorTenant } from "@/lib/utils/operator";
import { normalizePhone } from "@/lib/utils/normalizePhone";

export async function PATCH(req: Request) {
  const { user } = await withAuth({ ensureSignedIn: true });
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tenant = await getOperatorTenant(user.id);
  if (!tenant) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json() as {
    name?: string;
    contactName?: string;
    contactEmail?: string;
    contactPhone?: string;
  };

  if (body.name !== undefined && !body.name.trim()) {
    return NextResponse.json({ error: "Company name cannot be empty" }, { status: 400 });
  }

  const updates: Record<string, string | null> = {};
  if (body.name !== undefined)         updates.name         = body.name.trim();
  if (body.contactName !== undefined)  updates.contactName  = body.contactName.trim() || null;
  if (body.contactEmail !== undefined) updates.contactEmail = body.contactEmail.trim() || null;
  if (body.contactPhone !== undefined) updates.contactPhone = normalizePhone(body.contactPhone) ?? (body.contactPhone.trim() || null);

  await prisma.tenant.update({ where: { id: tenant.id }, data: updates });

  await prisma.auditLog.create({
    data: {
      entityType: "tenant",
      entityId: tenant.id,
      action: "account_details_updated",
      actorId: user.id,
      metadata: updates,
    },
  });

  return NextResponse.json({ success: true });
}
