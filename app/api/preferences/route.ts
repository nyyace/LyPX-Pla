import { withAuth } from "@workos-inc/authkit-nextjs";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { DEFAULT_TIMEZONE, SUPPORTED_TIMEZONES } from "@/lib/utils/date";

export async function GET() {
  const { user } = await withAuth({ ensureSignedIn: true });
  const pref = await prisma.userPreference.findUnique({ where: { userId: user.id } });
  return NextResponse.json({ timezone: pref?.timezone ?? DEFAULT_TIMEZONE });
}

export async function PATCH(req: Request) {
  const { user } = await withAuth({ ensureSignedIn: true });
  const body = await req.json();
  const { timezone } = body;

  const valid = SUPPORTED_TIMEZONES.some((tz) => tz.value === timezone);
  if (!valid) {
    return NextResponse.json({ error: "Invalid timezone" }, { status: 400 });
  }

  const pref = await prisma.userPreference.upsert({
    where: { userId: user.id },
    update: { timezone },
    create: { userId: user.id, timezone },
  });

  await prisma.auditLog.create({
    data: {
      entityType: "user_preference",
      entityId: user.id,
      action: "timezone_updated",
      actorId: user.id,
      metadata: { timezone },
    },
  });

  return NextResponse.json({ timezone: pref.timezone });
}
