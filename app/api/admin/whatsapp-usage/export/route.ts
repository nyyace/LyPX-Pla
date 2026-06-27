import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@workos-inc/authkit-nextjs";
import { prisma } from "@/lib/prisma";

function periodToRange(period: string): { start: Date; end: Date } {
  const [y, m] = period.split("-").map(Number);
  const start = new Date(y, m - 1, 1);
  const end   = new Date(y, m, 1);
  return { start, end };
}

export async function GET(req: NextRequest) {
  await withAuth({ ensureSignedIn: true });

  const { searchParams } = new URL(req.url);
  const period   = searchParams.get("period") ?? (() => { const n = new Date(); return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}`; })();
  const opFilter = searchParams.get("operator") ?? undefined;
  const catFilter = searchParams.get("category") ?? undefined;
  const billableParam = searchParams.get("billable");
  const billableFilter = billableParam === "true" ? true : billableParam === "false" ? false : undefined;

  const { start, end } = periodToRange(period);

  const [logs, tenants] = await Promise.all([
    prisma.whatsAppMessageLog.findMany({
      where: {
        sentAt:   { gte: start, lt: end },
        tenantId: opFilter      ?? undefined,
        category: catFilter     ?? undefined,
        billable: billableFilter,
      },
      orderBy: { sentAt: "asc" },
      select: {
        tenantId: true,
        messageType: true,
        recipient: true,
        recipientPhone: true,
        wamid: true,
        status: true,
        billable: true,
        category: true,
        pricingModel: true,
        sentAt: true,
        orderId: true,
      },
    }),
    prisma.tenant.findMany({ select: { id: true, name: true } }),
  ]);

  const tenantMap = new Map(tenants.map((t) => [t.id, t.name]));

  const header = ["wamid", "tenantId", "operatorName", "messageType", "recipient", "recipientPhone", "status", "billable", "category", "pricingModel", "orderId", "sentAt"];
  const rows = logs.map((l) => [
    l.wamid,
    l.tenantId ?? "",
    l.tenantId ? (tenantMap.get(l.tenantId) ?? "") : "Platform",
    l.messageType,
    l.recipient,
    l.recipientPhone,
    l.status,
    l.billable ? "true" : "false",
    l.category ?? "",
    l.pricingModel ?? "",
    l.orderId ?? "",
    l.sentAt.toISOString(),
  ]);

  const csv = [header, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    .join("\n");

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="whatsapp-usage-${period}.csv"`,
    },
  });
}
