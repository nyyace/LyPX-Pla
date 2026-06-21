import { NextResponse } from "next/server";
import { sendWhatsAppTemplate, WHATSAPP_TEMPLATES, TemplateKey } from "@/lib/whatsapp/client";

export async function POST(req: Request) {
  const body = await req.json();
  const { to, templateKey, components, orderId } = body;

  if (!to || !templateKey) {
    return NextResponse.json({ error: "Missing to or templateKey" }, { status: 400 });
  }

  if (!(templateKey in WHATSAPP_TEMPLATES)) {
    return NextResponse.json(
      { error: `Unknown template: ${templateKey}. Valid: ${Object.keys(WHATSAPP_TEMPLATES).join(", ")}` },
      { status: 400 }
    );
  }

  try {
    const result = await sendWhatsAppTemplate({
      to,
      templateKey: templateKey as TemplateKey,
      components: components ?? [],
      orderId,
      actorId: "admin",
    });

    return NextResponse.json({ ok: true, messageId: result.messageId });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Send failed";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
