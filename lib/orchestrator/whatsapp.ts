import { prisma } from "@/lib/prisma";

export interface WhatsAppCredentials {
  accessToken: string;
  phoneNumberId: string;
}

// Resolve which WhatsApp credentials to use for a given tenant.
// Checks for the operator's own connected WABA first; falls back to
// LyPX shared credentials. Stage B populates TenantWhatsApp — no code
// change needed at that point.
export async function resolveWhatsAppCredentials(
  tenantId: string
): Promise<WhatsAppCredentials> {
  const tenantWA = await prisma.tenantWhatsApp.findUnique({
    where: { tenantId, status: "connected" },
    select: { accessToken: true, phoneNumberId: true },
  });

  if (tenantWA?.accessToken && tenantWA?.phoneNumberId) {
    return {
      accessToken: tenantWA.accessToken,
      phoneNumberId: tenantWA.phoneNumberId,
    };
  }

  return {
    accessToken: process.env.META_WHATSAPP_ACCESS_TOKEN!,
    phoneNumberId: process.env.META_WHATSAPP_PHONE_NUMBER_ID!,
  };
}
