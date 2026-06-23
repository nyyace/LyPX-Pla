// Fires at 16:00 UTC daily = 00:00 SGT
// Expire stale account claims whose 90-day window has passed without a won trip.
import { NextResponse } from "next/server";
import { expireStaleClaimsJob } from "@/lib/claims/engine";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const secret = req.headers.get("x-cron-secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await expireStaleClaimsJob();
  return NextResponse.json({ ok: true });
}
