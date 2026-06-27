import type { PrismaClient } from "../generated/prisma";

/**
 * Resolve the three WhatsApp recipients for a booking.
 *
 * Requestor — who placed the booking:
 *   LyPX Direct → Account.picWhatsapp
 *   Operator    → Tenant.contactPhone
 *
 * Passenger — the actual traveller:
 *   sameAsRequestor=true  → requestor number
 *   sameAsRequestor=false → Order.passengerWhatsapp
 *
 * Driver — assigned chauffeur:
 *   Order.driver.phoneNumber
 */
export async function resolveRecipients(
  orderId: string,
  prisma: PrismaClient
): Promise<{
  requestor: string | null;
  passenger: string | null;
  driver: string | null;
}> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      account: true,
      tenant: true,
      driver: true,
    },
  });

  if (!order) return { requestor: null, passenger: null, driver: null };

  const isLyPXDirect = order.tenant.tenantType === "lypx_direct";
  const requestor = isLyPXDirect
    ? order.account?.picWhatsapp ?? null
    : order.tenant.contactPhone ?? null;

  const passenger = order.sameAsRequestor
    ? requestor
    : order.passengerWhatsapp ?? null;

  const driver = order.driver?.phoneNumber ?? null;

  return { requestor, passenger, driver };
}

