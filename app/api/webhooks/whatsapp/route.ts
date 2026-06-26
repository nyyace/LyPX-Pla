import { NextRequest, NextResponse } from "next/server";

// Meta webhook verification (GET)
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

// Incoming messages (POST)
export async function POST(req: NextRequest) {
  // Acknowledge immediately — Meta requires 200 within 20s
  const body = await req.json().catch(() => null);
  console.log("[whatsapp webhook]", JSON.stringify(body));
  return NextResponse.json({ ok: true });
}
