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
  const body = await req.json() as {
    contactName?: string;
    contactEmail?: string;
    contactPhone?: string;
  };

  const tenant = await prisma.tenant.findUnique({
    where: { id },
    select: { id: true, tenantType: true },
  });
  if (!tenant || tenant.tenantType !== "operator") {
    return NextResponse.json({ error: "Operator not found" }, { status: 404 });
  }

  const updates: { contactName?: string | null; contactEmail?: string | null; contactPhone?: string | null } = {};
  if (body.contactName  !== undefined) updates.contactName  = body.contactName.trim()  || null;
  if (body.contactEmail !== undefined) updates.contactEmail = body.contactEmail.trim() || null;
  if (body.contactPhone !== undefined) updates.contactPhone = body.contactPhone.trim() || null;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  await prisma.tenant.update({ where: { id }, data: updates });

  await prisma.auditLog.create({
    data: {
      entityType: "tenant",
      entityId: id,
      action: "contact_updated",
      actorId: user.id,
      metadata: updates,
    },
  });

  return NextResponse.json({ success: true, ...updates });
}
