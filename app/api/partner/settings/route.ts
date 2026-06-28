import { withAuth } from "@workos-inc/authkit-nextjs";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getPartnerAccount } from "@/lib/utils/partner";
import { normalizePhone } from "@/lib/utils/normalizePhone";

export async function GET() {
  const { user } = await withAuth({ ensureSignedIn: true });
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const account = await getPartnerAccount(user.id);
  if (!account) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  return NextResponse.json({
    picName:     account.picName,
    picWhatsapp: account.picWhatsapp,
    picEmail:    account.picEmail,
  });
}

export async function PATCH(req: Request) {
  const { user } = await withAuth({ ensureSignedIn: true });
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const account = await getPartnerAccount(user.id);
  if (!account) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json() as {
    picName?:     string | null;
    picEmail?:    string | null;
    picWhatsapp?: string | null;
  };

  const updates: { picName?: string | null; picEmail?: string | null; picWhatsapp?: string | null } = {};
  if (body.picName     !== undefined) updates.picName     = body.picName?.trim()     || null;
  if (body.picEmail    !== undefined) updates.picEmail    = body.picEmail?.trim()    || null;
  if (body.picWhatsapp !== undefined) {
    updates.picWhatsapp = body.picWhatsapp
      ? (normalizePhone(body.picWhatsapp) ?? (body.picWhatsapp.trim() || null))
      : null;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  await prisma.account.update({ where: { id: account.id }, data: updates });

  await prisma.auditLog.create({
    data: {
      entityType: "account",
      entityId:   account.id,
      action:     "partner_contact_updated",
      actorId:    user.id,
      metadata:   updates,
    },
  });

  return NextResponse.json({ success: true });
}
