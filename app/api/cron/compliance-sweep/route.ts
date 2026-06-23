// Fires at 16:00 UTC daily = 00:00 SGT
// Evaluate all driver and vehicle compliance statuses.
import { NextResponse } from "next/server";
import { runComplianceSweep } from "@/lib/compliance/state-machine";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const secret = req.headers.get("x-cron-secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await runComplianceSweep();
  return NextResponse.json({ ok: true });
}
