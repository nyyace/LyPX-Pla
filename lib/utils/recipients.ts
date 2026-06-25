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

/**
 * Determine which recipients receive a given template.
 * Returns a deduped array of phone numbers (nulls filtered out).
 */
export function getTemplateRecipients(
  templateName: string,
  recipients: {
    requestor: string | null;
    passenger: string | null;
    driver: string | null;
  }
): string[] {
  const { requestor, passenger, driver } = recipients;

  const sets: Record<string, (string | null)[]> = {
    job_driver_assigned:     [requestor, passenger, driver],
    job_driver_assigned_mng: [requestor, passenger, driver],
    job_driver_otw:          [requestor, passenger],
    job_driver_arrived:      [requestor, passenger],
    job_trip_started:        [requestor, passenger],
    job_trip_completed:      [requestor, passenger],
    job_trip_feedback:       [passenger],
  };

  const numbers = sets[templateName] ?? [];
  return [...new Set(numbers.filter((n): n is string => !!n))];
}
