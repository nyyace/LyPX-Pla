import { prisma } from "@/lib/prisma";

export interface BookerRecipient {
  phone: string;
  picName: string | null;
}

// Resolves the WhatsApp recipient for booker-facing trip notifications.
// Returns null (and writes an audit skip) if the account has no PIC WhatsApp.
export async function resolveBookerRecipient(
  orderId: string
): Promise<BookerRecipient | null> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { accountId: true },
  });

  if (!order) return null;

  const account = await prisma.account.findUnique({
    where: { id: order.accountId },
    select: { picWhatsapp: true, picName: true },
  });

  if (!account?.picWhatsapp) {
    await prisma.auditLog.create({
      data: {
        entityType: "order",
        entityId: orderId,
        action: "whatsapp_skipped",
        actorId: "system",
        metadata: { reason: "no_pic_whatsapp", accountId: order.accountId },
      },
    });
    return null;
  }

  return {
    phone: account.picWhatsapp,
    picName: account.picName ?? null,
  };
}
