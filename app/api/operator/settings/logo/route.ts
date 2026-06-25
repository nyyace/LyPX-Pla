import { withAuth } from "@workos-inc/authkit-nextjs";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getOperatorTenant } from "@/lib/utils/operator";
import { uploadToR2, deleteFromR2, getPublicUrl, getPresignedUrl } from "@/lib/r2";
import sharp from "sharp";

const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif", "image/svg+xml"];
const MAX_SIZE_BYTES = 2 * 1024 * 1024; // 2MB
const LOGO_HEIGHT_PX = 60; // 30pt × 2x retina

export async function POST(req: Request) {
  const { user } = await withAuth({ ensureSignedIn: true });
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tenant = await getOperatorTenant(user.id);
  if (!tenant) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const formData = await req.formData();
  const file = formData.get("logo") as File | null;
  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: "Invalid file type. Accepted: PNG, JPG, WEBP, SVG" }, { status: 400 });
  }
  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json({ error: "File too large. Maximum size is 2MB" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  // Process with sharp (skip for SVG — serve as-is)
  // Resize to 60px height proportionally; preserve original format — no conversion
  let processed: Buffer;
  const outputType = file.type;
  if (file.type === "image/svg+xml") {
    processed = buffer;
  } else {
    processed = await sharp(buffer)
      .resize({
        height: LOGO_HEIGHT_PX,
        width: undefined,          // auto — maintain aspect ratio
        fit: "inside",             // never crop, never upscale beyond original
        withoutEnlargement: true,
      })
      .toBuffer();
  }

  const EXT_MAP: Record<string, string> = {
    "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp",
    "image/gif": "gif", "image/svg+xml": "svg",
  };
  const ext = EXT_MAP[file.type] ?? "png";
  const key = `logos/${tenant.id}/logo_${Date.now()}.${ext}`;

  // Delete previous logo if exists
  const existing = await prisma.tenantPreference.findUnique({
    where: { tenantId: tenant.id },
    select: { logoKey: true },
  });
  if (existing?.logoKey) {
    try { await deleteFromR2(existing.logoKey); } catch { /* ignore if already gone */ }
  }

  await uploadToR2(key, processed, outputType);

  const publicUrl = getPublicUrl(key);
  const logoUrl = publicUrl ?? await getPresignedUrl(key, 365 * 24 * 3600).catch(() => null);

  await prisma.tenantPreference.upsert({
    where: { tenantId: tenant.id },
    create: { tenantId: tenant.id, logoKey: key, logoUrl: logoUrl ?? undefined },
    update: { logoKey: key, logoUrl: logoUrl ?? undefined },
  });

  await prisma.auditLog.create({
    data: {
      entityType: "tenant",
      entityId: tenant.id,
      action: "logo_uploaded",
      actorId: user.id,
      metadata: { key },
    },
  });

  return NextResponse.json({ logoKey: key, logoUrl });
}

export async function DELETE() {
  const { user } = await withAuth({ ensureSignedIn: true });
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tenant = await getOperatorTenant(user.id);
  if (!tenant) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const pref = await prisma.tenantPreference.findUnique({
    where: { tenantId: tenant.id },
    select: { logoKey: true },
  });

  if (pref?.logoKey) {
    try { await deleteFromR2(pref.logoKey); } catch { /* ignore */ }
    await prisma.tenantPreference.update({
      where: { tenantId: tenant.id },
      data: { logoKey: null, logoUrl: null },
    });
  }

  await prisma.auditLog.create({
    data: {
      entityType: "tenant",
      entityId: tenant.id,
      action: "logo_removed",
      actorId: user.id,
      metadata: {},
    },
  });

  return NextResponse.json({ success: true });
}
