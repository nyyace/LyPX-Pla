import { resolveWhatsAppCredentials } from "./whatsapp";

export async function sendWhatsAppTemplate({
  to,
  templateName,
  language,
  variables,
  tenantId,
}: {
  to: string;
  templateName: string;
  language: string;
  variables: string[];
  tenantId?: string;
}): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const creds = await resolveWhatsAppCredentials(tenantId ?? "lypx_direct");

  const body = {
    messaging_product: "whatsapp",
    to: to.replace(/\s/g, ""),
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

    return { success: true, messageId: data?.messages?.[0]?.id };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
}
