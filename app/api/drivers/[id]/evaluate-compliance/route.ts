import { NextResponse } from "next/server";
import { evaluateAndSyncDriverCompliance } from "@/lib/compliance/state-machine";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    await evaluateAndSyncDriverCompliance(id, "admin");
    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
