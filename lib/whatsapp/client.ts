import { prisma } from "@/lib/prisma";
import { WHATSAPP_TEMPLATES, type TemplateKey } from "./templates";

export { WHATSAPP_TEMPLATES, type TemplateKey };

const BASE_URL = "https://graph.facebook.com/v19.0";
const PHONE_NUMBER_ID = process.env.META_WHATSAPP_PHONE_NUMBER_ID!;
const ACCESS_TOKEN = process.env.META_WHATSAPP_ACCESS_TOKEN!;

export interface SendTemplateParams {
  to: string;
  templateKey: TemplateKey;
  components?: object[];
  orderId?: string;
  actorId?: string;
}

export async function sendWhatsAppTemplate({
  to,
  templateKey,
  components = [],
  orderId,
  actorId = "admin",
}: SendTemplateParams): Promise<{ messageId: string }> {
  const template = WHATSAPP_TEMPLATES[templateKey];

  const body = {
    messaging_product: "whatsapp",
    to,
    type: "template",
    template: {
      name: template.name,
      language: { code: template.language },
      components,
    },
  };

  const res = await fetch(`${BASE_URL}/${PHONE_NUMBER_ID}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${ACCESS_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(
      `WhatsApp API error ${res.status}: ${JSON.stringify(data)}`
    );
  }

  const messageId = data.messages?.[0]?.id ?? "unknown";

  await prisma.auditLog.create({
    data: {
      entityType: "order",
      entityId: orderId ?? "none",
      action: "whatsapp_sent",
      actorId,
      metadata: { templateKey, to, messageId },
    },
  });

  return { messageId };
}
