import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ ok: true });

  const entries = body?.entry ?? [];

  for (const entry of entries) {
    for (const change of entry?.changes ?? []) {
      if (change?.field !== "messages") continue;

      const statuses: unknown[] = change?.value?.statuses ?? [];

      for (const s of statuses) {
        const update = s as {
          id?: string;
          status?: string;
          pricing?: { billable?: boolean; pricing_model?: string; category?: string };
        };

        const wamid  = update?.id;
        const status = update?.status;
        if (!wamid || !status) continue;

        const pricing = update?.pricing;

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
              messageType:   "unknown",
              recipient:     "unknown",
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
