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
    return NextResponse.json({ error: "WhatsApp not enabled" }, { status: 403 });
  }

  // Get all messages for this tenant, ordered newest first
  const messages = await prisma.whatsAppMessage.findMany({
    where: { tenantId: tenant.id },
    orderBy: { createdAt: "desc" },
    take: 500,
  });

  // Group into conversations by counterpart phone number
  const convMap = new Map<string, {
    phone: string;
    messages: typeof messages;
    lastAt: Date;
    unreadCount: number;
  }>();

  for (const msg of messages) {
    const phone = msg.direction === "inbound" ? msg.from : msg.to;
    const existing = convMap.get(phone);
    if (!existing) {
      convMap.set(phone, {
        phone,
        messages: [msg],
        lastAt: msg.createdAt,
        unreadCount: msg.direction === "inbound" && !msg.isRead ? 1 : 0,
      });
    } else {
      existing.messages.push(msg);
      if (msg.createdAt > existing.lastAt) existing.lastAt = msg.createdAt;
      if (msg.direction === "inbound" && !msg.isRead) existing.unreadCount++;
    }
  }

  const conversations = Array.from(convMap.values())
    .sort((a, b) => b.lastAt.getTime() - a.lastAt.getTime())
    .map(c => ({
      phone: c.phone,
      lastAt: c.lastAt.toISOString(),
      unreadCount: c.unreadCount,
      messages: c.messages.map(m => ({
        id: m.id,
        direction: m.direction,
        from: m.from,
        to: m.to,
        body: m.body,
        templateName: m.templateName,
        isRead: m.isRead,
        createdAt: m.createdAt.toISOString(),
      })),
    }));

  return NextResponse.json({ conversations });
}
