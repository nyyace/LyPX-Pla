import { prisma } from "@/lib/prisma";
import { resolveWhatsAppCredentials } from "./whatsapp";
import { maskPhone } from "@/lib/utils/phone";

export async function sendWhatsAppTemplate({
  to,
  templateName,
  language,
  variables,
  tenantId,
  messageType,
  recipient,
  orderId,
}: {
  to: string;
  templateName: string;
  language: string;
  variables: string[];
  tenantId?: string;
  messageType?: string;
  recipient?: string;
  orderId?: string;
}): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const creds = await resolveWhatsAppCredentials(tenantId ?? "lypx_direct");
  const normalizedPhone = to.replace(/\s/g, "");

  const body = {
    messaging_product: "whatsapp",
    to: normalizedPhone,
    type: "template",
    template: {
      name: templateName,
      language: { code: language },
      components: [
        {
          type: "body",
          parameters: variables.map((v) => ({ type: "text", text: String(v) })),
        },
      ],
    },
  };

  try {
    const res = await fetch(
      `https://graph.facebook.com/v19.0/${creds.phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${creds.accessToken}`,
        },
        body: JSON.stringify(body),
      }
    );

    const data = await res.json();

    if (!res.ok) {
      return { success: false, error: data?.error?.message ?? `HTTP ${res.status}` };
    }

    const messageId: string | undefined = data?.messages?.[0]?.id;

    if (messageId) {
      try {
        await prisma.whatsAppMessageLog.create({
          data: {
            tenantId:      tenantId ?? null,
            messageType:   messageType ?? templateName,
            recipient:     recipient  ?? "unknown",
            recipientPhone: maskPhone(normalizedPhone),
            wamid:         messageId,
            status:        "sent",
            orderId:       orderId ?? null,
          },
        });
      } catch (logErr) {
        console.error("[sender] message log create failed:", logErr);
      }
    }

    return { success: true, messageId };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
}
