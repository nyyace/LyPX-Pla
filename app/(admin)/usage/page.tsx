import { prisma } from "@/lib/prisma";
import { withAuth } from "@workos-inc/authkit-nextjs";
import Link from "next/link";

const SGD_PER_BILLABLE_UTILITY = 0.05;

function periodToRange(period: string): { start: Date; end: Date } {
  const [y, m] = period.split("-").map(Number);
  if (!y || !m || m < 1 || m > 12) {
    const now = new Date();
    return periodToRange(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`);
  }
  const start = new Date(y, m - 1, 1);
  const end   = new Date(y, m, 1);
  return { start, end };
}

function currentPeriod() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function prevPeriod(period: string) {
  const [y, m] = period.split("-").map(Number);
  const d = new Date(y, m - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function nextPeriod(period: string) {
  const [y, m] = period.split("-").map(Number);
  const d = new Date(y, m, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function formatPeriodLabel(period: string) {
  const [y, m] = period.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-SG", { month: "long", year: "numeric" });
}

function buildUrl(base: string, params: Record<string, string | undefined>) {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v) q.set(k, v);
  }
  const qs = q.toString();
  return qs ? `${base}?${qs}` : base;
}

export default async function UsagePage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string; operator?: string; category?: string; billable?: string }>;
}) {
  await withAuth({ ensureSignedIn: true });

  const params = await searchParams;
  const period   = params.period   ?? currentPeriod();
  const opFilter = params.operator && params.operator !== "all" ? params.operator : undefined;
  const catFilter = params.category && params.category !== "all" ? params.category : undefined;
  const billableFilter =
    params.billable === "true"  ? true  :
    params.billable === "false" ? false :
    undefined;

  const { start, end } = periodToRange(period);
  const isFuture = start > new Date();

  const [tenants, rawLogs] = await Promise.all([
    prisma.tenant.findMany({
      where: { status: "active" },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    isFuture ? Promise.resolve([]) : prisma.whatsAppMessageLog.findMany({
      where: {
        sentAt:   { gte: start, lt: end },
        tenantId: opFilter   ?? undefined,
        category: catFilter  ?? undefined,
        billable: billableFilter,
      },
      select: { tenantId: true, status: true, billable: true, category: true },
    }),
  ]);

  // Group by tenantId
  const grouped = new Map<string | null, { sent: number; delivered: number; read: number; failed: number; billable: number; nonBillable: number }>();

  for (const log of rawLogs) {
    const key = log.tenantId ?? "__platform__";
    if (!grouped.has(key)) {
      grouped.set(key, { sent: 0, delivered: 0, read: 0, failed: 0, billable: 0, nonBillable: 0 });
    }
    const g = grouped.get(key)!;
    g.sent++;
    if (log.status === "delivered") g.delivered++;
    if (log.status === "read")      g.read++;
    if (log.status === "failed")    g.failed++;
    if (log.billable)  g.billable++;
    else               g.nonBillable++;
  }

  const tenantMap = new Map(tenants.map((t) => [t.id, t.name]));

  const rows = [...grouped.entries()]
    .map(([key, stats]) => ({
      key,
      name: key === "__platform__" ? "Platform (no operator)" : (tenantMap.get(key!) ?? key!),
      ...stats,
      estCost: stats.billable * SGD_PER_BILLABLE_UTILITY,
    }))
    .sort((a, b) => b.sent - a.sent);

  const totals = rows.reduce(
    (acc, r) => ({
      sent:        acc.sent        + r.sent,
      delivered:   acc.delivered   + r.delivered,
      read:        acc.read        + r.read,
      failed:      acc.failed      + r.failed,
      billable:    acc.billable    + r.billable,
      nonBillable: acc.nonBillable + r.nonBillable,
      estCost:     acc.estCost     + r.estCost,
    }),
    { sent: 0, delivered: 0, read: 0, failed: 0, billable: 0, nonBillable: 0, estCost: 0 }
  );

  const categories = ["utility", "marketing", "authentication"];

  const filterParams = { period, operator: params.operator, category: params.category, billable: params.billable };

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-white">WhatsApp Usage</h1>
        <p className="text-sm text-gray-500 mt-1">Per-operator message counts and estimated Meta billing</p>
      </div>

      {/* Period nav */}
      <div className="flex items-center gap-3 mb-5">
        <Link
          href={buildUrl("/usage", { ...filterParams, period: prevPeriod(period) })}
          className="px-2 py-1 text-gray-500 hover:text-gray-300 text-sm"
        >
          ← Prev
        </Link>
        <span className="text-white font-medium text-sm">{formatPeriodLabel(period)}</span>
        <Link
          href={buildUrl("/usage", { ...filterParams, period: nextPeriod(period) })}
          className="px-2 py-1 text-gray-500 hover:text-gray-300 text-sm"
        >
          Next →
        </Link>
        {period !== currentPeriod() && (
          <Link
            href={buildUrl("/usage", { ...filterParams, period: undefined })}
            className="ml-2 text-xs text-gray-600 hover:text-gray-400"
          >
            Back to current month
          </Link>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-4 flex-wrap items-center">
        {/* Operator filter */}
        <span className="text-xs text-gray-600 mr-1">Operator:</span>
        <Link
          href={buildUrl("/usage", { ...filterParams, operator: undefined })}
          className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${!opFilter ? "bg-gray-700 text-white" : "text-gray-500 hover:text-gray-300"}`}
        >
          All
        </Link>
        {tenants.map((t) => (
          <Link
            key={t.id}
            href={buildUrl("/usage", { ...filterParams, operator: t.id })}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${opFilter === t.id ? "bg-gray-700 text-white" : "text-gray-500 hover:text-gray-300"}`}
          >
            {t.name}
          </Link>
        ))}
      </div>

      <div className="flex gap-2 mb-6 flex-wrap items-center">
        {/* Category filter */}
        <span className="text-xs text-gray-600 mr-1">Category:</span>
        <Link
          href={buildUrl("/usage", { ...filterParams, category: undefined })}
          className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${!catFilter ? "bg-gray-700 text-white" : "text-gray-500 hover:text-gray-300"}`}
        >
          All
        </Link>
        {categories.map((c) => (
          <Link
            key={c}
            href={buildUrl("/usage", { ...filterParams, category: c })}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${catFilter === c ? "bg-gray-700 text-white" : "text-gray-500 hover:text-gray-300"}`}
          >
            {c}
          </Link>
        ))}

        {/* Billable filter */}
        <span className="text-xs text-gray-600 ml-4 mr-1">Billable:</span>
        {[
          { label: "All",          value: undefined  },
          { label: "Billable",     value: "true"     },
          { label: "Non-billable", value: "false"    },
        ].map(({ label, value }) => (
          <Link
            key={label}
            href={buildUrl("/usage", { ...filterParams, billable: value })}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${params.billable === value ? "bg-gray-700 text-white" : "text-gray-500 hover:text-gray-300"}`}
          >
            {label}
          </Link>
        ))}
      </div>

      {/* Summary strip */}
      {rawLogs.length > 0 && (
        <div className="grid grid-cols-4 gap-3 mb-6">
          {[
            { label: "Total Sent",    value: totals.sent.toLocaleString() },
            { label: "Billable",      value: totals.billable.toLocaleString() },
            { label: "Non-billable",  value: totals.nonBillable.toLocaleString() },
            { label: "Est. Cost",     value: `SGD ${totals.estCost.toFixed(2)}` },
          ].map(({ label, value }) => (
            <div key={label} className="bg-gray-900 border border-gray-800 rounded-md px-4 py-3">
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">{label}</p>
              <p className="text-lg font-semibold text-white font-mono">{value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Table */}
      {isFuture ? (
        <div className="text-center py-16 text-gray-600 text-sm">No data for future periods</div>
      ) : rawLogs.length === 0 ? (
        <div className="text-center py-16 text-gray-600 text-sm">No messages logged for this period</div>
      ) : (
        <>
          <div className="rounded-md border border-gray-800 overflow-hidden mb-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left px-4 py-3 text-gray-400 font-medium">Operator</th>
                  <th className="text-right px-4 py-3 text-gray-400 font-medium">Sent</th>
                  <th className="text-right px-4 py-3 text-gray-400 font-medium">Delivered</th>
                  <th className="text-right px-4 py-3 text-gray-400 font-medium">Read</th>
                  <th className="text-right px-4 py-3 text-gray-400 font-medium">Failed</th>
                  <th className="text-right px-4 py-3 text-gray-400 font-medium">Billable</th>
                  <th className="text-right px-4 py-3 text-gray-400 font-medium">Non-billable</th>
                  <th className="text-right px-4 py-3 text-gray-400 font-medium">Est. cost (SGD)</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.key} className="border-b border-gray-800 hover:bg-gray-900 last:border-0">
                    <td className="px-4 py-3 text-white">{row.name}</td>
                    <td className="px-4 py-3 text-right font-mono text-gray-300">{row.sent}</td>
                    <td className="px-4 py-3 text-right font-mono text-gray-300">{row.delivered}</td>
                    <td className="px-4 py-3 text-right font-mono text-gray-300">{row.read}</td>
                    <td className="px-4 py-3 text-right font-mono text-red-400">{row.failed > 0 ? row.failed : <span className="text-gray-600">0</span>}</td>
                    <td className="px-4 py-3 text-right font-mono text-gray-300">{row.billable}</td>
                    <td className="px-4 py-3 text-right font-mono text-gray-500">{row.nonBillable}</td>
                    <td className="px-4 py-3 text-right font-mono text-gray-300">{row.estCost.toFixed(2)}</td>
                  </tr>
                ))}
                {/* Totals row */}
                <tr className="bg-gray-900 border-t-2 border-gray-700">
                  <td className="px-4 py-3 text-gray-400 font-medium text-xs uppercase tracking-wide">Total</td>
                  <td className="px-4 py-3 text-right font-mono text-white font-semibold">{totals.sent}</td>
                  <td className="px-4 py-3 text-right font-mono text-white">{totals.delivered}</td>
                  <td className="px-4 py-3 text-right font-mono text-white">{totals.read}</td>
                  <td className="px-4 py-3 text-right font-mono text-red-400">{totals.failed > 0 ? totals.failed : <span className="text-gray-600">0</span>}</td>
                  <td className="px-4 py-3 text-right font-mono text-white">{totals.billable}</td>
                  <td className="px-4 py-3 text-right font-mono text-gray-400">{totals.nonBillable}</td>
                  <td className="px-4 py-3 text-right font-mono text-white font-semibold">{totals.estCost.toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* CSV export */}
          <div className="flex justify-end">
            <a
              href={`/api/admin/whatsapp-usage/export?period=${period}${opFilter ? `&operator=${opFilter}` : ""}${catFilter ? `&category=${catFilter}` : ""}${params.billable ? `&billable=${params.billable}` : ""}`}
              className="px-3 py-1.5 text-xs text-gray-400 border border-gray-700 rounded-md hover:bg-gray-900 hover:text-gray-200 transition-colors"
            >
              Export CSV
            </a>
          </div>

          <p className="text-xs text-gray-600 mt-3">
            Rate: SGD {SGD_PER_BILLABLE_UTILITY.toFixed(2)} per billable utility message (Meta PMP). Delivered + read counts update as Meta webhooks arrive.
          </p>
        </>
      )}
    </div>
  );
}
