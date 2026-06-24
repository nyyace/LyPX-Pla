import { withAuth } from "@workos-inc/authkit-nextjs";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { isAdminUser } from "@/lib/utils/admin";

const VALIDATION: Record<string, { min: number; max: number; label: string }> = {
  marketplace_take_rate_percent: { min: 1,  max: 30, label: "Take rate" },
  marketplace_floor_rate_sgd:    { min: 0,  max: 50, label: "Floor rate" },
};

export async function GET() {
  const { user } = await withAuth({ ensureSignedIn: true });
  if (!user || !(await isAdminUser(user.id))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const configs = await prisma.platformConfig.findMany({
    orderBy: { key: "asc" },
  });

  return NextResponse.json({ configs });
}

export async function PATCH(req: Request) {
  const { user } = await withAuth({ ensureSignedIn: true });
  if (!user || !(await isAdminUser(user.id))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { key, value } = await req.json() as { key: string; value: string };

  if (!key || value === undefined || value === null) {
    return NextResponse.json({ error: "key and value are required" }, { status: 400 });
  }

  const rule = VALIDATION[key];
  if (!rule) {
    return NextResponse.json({ error: `Unknown config key: ${key}` }, { status: 400 });
  }

  const num = parseFloat(value);
  if (isNaN(num)) {
    return NextResponse.json({ error: `${rule.label} must be a number` }, { status: 400 });
  }
  if (num < rule.min || num > rule.max) {
    return NextResponse.json(
      { error: `${rule.label} must be between ${rule.min} and ${rule.max}` },
      { status: 400 }
    );
  }
  // Max 2 decimal places
  if (!/^\d+(\.\d{1,2})?$/.test(String(num))) {
    return NextResponse.json(
      { error: `${rule.label} allows at most 2 decimal places` },
      { status: 400 }
    );
  }

  const existing = await prisma.platformConfig.findUnique({ where: { key } });
  if (!existing) {
    return NextResponse.json({ error: `Config key not found: ${key}` }, { status: 404 });
  }

  const previousValue = existing.value;
  const normalised = String(num);

  const updated = await prisma.$transaction(async (tx) => {
    const cfg = await tx.platformConfig.update({
      where: { key },
      data: { value: normalised, updatedBy: user.id },
    });
    await tx.auditLog.create({
      data: {
        entityType: "platform_config",
        entityId: cfg.id,
        action: "config_updated",
        actorId: user.id,
        metadata: { key, previousValue, newValue: normalised },
      },
    });
    return cfg;
  });

  return NextResponse.json(updated);
}
