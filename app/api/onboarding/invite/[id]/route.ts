import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const invite = await prisma.driverInviteRequest.findUnique({
    where: { id },
    select: { id: true, driverWhatsapp: true, driverName: true, status: true, expiresAt: true },
  });

  if (!invite) {
    return NextResponse.json({ valid: false, reason: "not_found" }, { status: 404 });
  }

  if (invite.expiresAt && invite.expiresAt < new Date()) {
    return NextResponse.json({ valid: false, reason: "expired" }, { status: 410 });
  }

  return NextResponse.json({
    valid: true,
    phone: invite.driverWhatsapp,
    name: invite.driverName ?? null,
  });
}
