import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveWhatsAppCredentials } from "@/lib/orchestrator/whatsapp";
import { handleInboundDriverMessage } from "@/lib/whatsapp/handleInboundDriver";
import { verifyMetaWebhookSignature } from "@/lib/whatsapp/verifySignature";
import { parseWhatsAppWebhookPayload } from "@/lib/whatsapp/webhookPayload";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode      = searchParams.get("hub.mode");
  const token     = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === process.env.META_WEBHOOK_VERIFY_TOKEN) {
    return new NextResponse(challenge, { status: 200 });
  }

  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();

  // Fail closed: missing/unset secret, missing header, or a mismatch all
  // reject with 403 — there is no path that skips verification and continues.
  const signatureValid = verifyMetaWebhookSignature(
    rawBody,
    req.headers.get("x-hub-signature-256"),
    process.env.META_APP_SECRET
  );
  if (!signatureValid) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
  }

  const body = parseWhatsAppWebhookPayload(rawBody);
  if (!body) return NextResponse.json({ ok: true });

  const entries = body.entry ?? [];

  for (const entry of entries) {
    for (const change of entry.changes ?? []) {
      if (change.field !== "messages") continue;

      const value = change.value;

      // ── Resolve tenantId from the receiving phone number ──────────────────
      const receivingPhoneId: string | null = value?.metadata?.phone_number_id ?? null;
      const tenantWhatsApp = receivingPhoneId
        ? await prisma.tenantWhatsApp.findFirst({
            where: { phoneNumberId: receivingPhoneId, status: "connected" },
            select: { tenantId: true },
          })
        : null;
      const tenantId = tenantWhatsApp?.tenantId ?? null;

      // ── Inbound messages (driver commands) ───────────────────────────────
      const messages = value?.messages ?? [];
      for (const message of messages) {
        if (message.type !== "text") continue;

        const result = await handleInboundDriverMessage(
          {
            from:     message.from    ?? "",
            body:     message.text?.body ?? "",
            wamid:    message.id      ?? "",
            tenantId,
          },
          prisma
        );

        if (result.handled && result.reply) {
          try {
            const creds = await resolveWhatsAppCredentials(tenantId ?? "lypx_direct");
            await fetch(
              `https://graph.facebook.com/v19.0/${creds.phoneNumberId}/messages`,
              {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${creds.accessToken}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  messaging_product: "whatsapp",
                  to:   message.from,
                  type: "text",
                  text: { body: result.reply },
                }),
              }
            );
          } catch (replyErr) {
            // Non-fatal — order was already updated even if reply fails
            console.error("[InboundDriver] Reply send failed:", replyErr);
          }
        }
      }

      // ── Outbound delivery status updates (unchanged) ─────────────────────
      const statuses = value?.statuses ?? [];

      for (const update of statuses) {
        const wamid  = update.id;
        const status = update.status;
        if (!wamid || !status) continue;

        const pricing = update.pricing;

        try {
          await prisma.whatsAppMessageLog.upsert({
            where: { wamid },
            update: {
              status,
              ...(pricing != null && {
                billable:     pricing.billable     ?? false,
                category:     pricing.category     ?? null,
                pricingModel: pricing.pricing_model ?? null,
              }),
            },
            create: {
              wamid,
              messageType:    "unknown",
              recipient:      "unknown",
              recipientPhone: "****",
              status,
              billable:     pricing?.billable     ?? false,
              category:     pricing?.category     ?? null,
              pricingModel: pricing?.pricing_model ?? null,
            },
          });
        } catch (err) {
          console.error("[whatsapp webhook] upsert failed:", err);
        }
      }
    }
  }

  return NextResponse.json({ ok: true });
}
