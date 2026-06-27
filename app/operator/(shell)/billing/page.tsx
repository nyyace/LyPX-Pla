import { prisma } from "@/lib/prisma";
import { withAuth } from "@workos-inc/authkit-nextjs";
import { getOperatorTenant } from "@/lib/utils/operator";
import { getUserTimezone } from "@/lib/utils/timezone";
import { redirect } from "next/navigation";
import { formatTZDate } from "@/lib/utils/date";

function fmtCurrency(amount: number | null, currency = "SGD") {
  if (amount == null) return "—";
  return `${currency} ${amount.toFixed(2)}`;
}

function periodLabel(date: Date) {
  return date.toLocaleDateString("en-SG", { month: "long", year: "numeric" });
}

export default async function OperatorBillingPage() {
  const { user } = await withAuth({ ensureSignedIn: true });
  const tenant = await getOperatorTenant(user.id);
  if (!tenant) redirect("/operator/dispatch");

  const tz = await getUserTimezone(user.id);

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [monthOrders, allCompleted, monthWaLogs] = await Promise.all([
    prisma.order.findMany({
      where: { tenantId: tenant.id, status: "completed", completedAt: { gte: monthStart } },
      select: { fareAmount: true, fareCurrency: true },
    }),
    prisma.order.findMany({
      where: { tenantId: tenant.id, status: "completed" },
      orderBy: { completedAt: "desc" },
      take: 100,
      include: {
        account: { select: { name: true } },
        driver: { select: { firstName: true, lastName: true } },
      },
    }),
    prisma.whatsAppMessageLog.findMany({
      where: { tenantId: tenant.id, sentAt: { gte: monthStart } },
      select: { status: true, billable: true, orderId: true, messageType: true, sentAt: true },
      orderBy: { sentAt: "asc" },
    }),
  ]);

  const monthRevenue = monthOrders.reduce((sum, o) => sum + (o.fareAmount ?? 0), 0);
  const hasRevenue = monthOrders.some(o => o.fareAmount != null);

  // WhatsApp usage summary
  const waSent      = monthWaLogs.length;
  const waBillable  = monthWaLogs.filter(l => l.billable).length;
  const waDelivered = monthWaLogs.filter(l => l.status === "delivered" || l.status === "read").length;

  // Per-reservation breakdown (group by orderId, only for logs with an orderId)
  const perOrder = new Map<string, number>();
  for (const log of monthWaLogs) {
    if (!log.orderId) continue;
    perOrder.set(log.orderId, (perOrder.get(log.orderId) ?? 0) + 1);
  }

  // Fetch job references for orders with messages
  const orderIds = [...perOrder.keys()];
  const ordersWithRef = orderIds.length > 0
    ? await prisma.order.findMany({
        where: { id: { in: orderIds } },
        select: { id: true, jobReference: true, pickupTime: true },
      })
    : [];

  const orderRefMap = new Map(ordersWithRef.map(o => [o.id, { ref: o.jobReference, pickupTime: o.pickupTime }]));

  const perOrderRows = [...perOrder.entries()]
    .map(([orderId, count]) => ({
      orderId,
      ref: orderRefMap.get(orderId)?.ref ?? orderId.slice(0, 12).toUpperCase(),
      pickupTime: orderRefMap.get(orderId)?.pickupTime ?? null,
      count,
    }))
    .sort((a, b) => (b.pickupTime?.getTime() ?? 0) - (a.pickupTime?.getTime() ?? 0));

  return (
    <div style={{ padding: "20px 24px" }}>
      {/* Revenue summary strip */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 24 }}>
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, padding: "14px 18px" }}>
          <p style={{ fontSize: 10, color: "var(--text-faint)", textTransform: "uppercase", letterSpacing: "0.7px", fontWeight: 700, marginBottom: 6 }}>
            This Month Revenue
          </p>
          <p className="mono" style={{ fontSize: 22, fontWeight: 600, color: hasRevenue ? "var(--text)" : "var(--text-faint)" }}>
            {hasRevenue ? `SGD ${monthRevenue.toFixed(2)}` : "—"}
          </p>
          <p style={{ fontSize: 10, color: "var(--text-faint)", marginTop: 4 }}>completed trips</p>
        </div>
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, padding: "14px 18px" }}>
          <p style={{ fontSize: 10, color: "var(--text-faint)", textTransform: "uppercase", letterSpacing: "0.7px", fontWeight: 700, marginBottom: 6 }}>
            Trips Completed
          </p>
          <p className="mono" style={{ fontSize: 22, fontWeight: 600, color: "var(--text)" }}>
            {monthOrders.length}
          </p>
          <p style={{ fontSize: 10, color: "var(--text-faint)", marginTop: 4 }}>this month</p>
        </div>
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, padding: "14px 18px" }}>
          <p style={{ fontSize: 10, color: "var(--text-faint)", textTransform: "uppercase", letterSpacing: "0.7px", fontWeight: 700, marginBottom: 6 }}>
            Avg Fare
          </p>
          <p className="mono" style={{ fontSize: 22, fontWeight: 600, color: hasRevenue && monthOrders.length > 0 ? "var(--text)" : "var(--text-faint)" }}>
            {hasRevenue && monthOrders.length > 0 ? `SGD ${(monthRevenue / monthOrders.length).toFixed(2)}` : "—"}
          </p>
          <p style={{ fontSize: 10, color: "var(--text-faint)", marginTop: 4 }}>per trip this month</p>
        </div>
      </div>

      {/* Revenue ledger */}
      <div style={{ display: "flex", alignItems: "center", marginBottom: 16 }}>
        <span className="panel-title">Revenue Ledger</span>
      </div>

      {allCompleted.length === 0 ? (
        <div style={{ textAlign: "center", padding: "64px 0", color: "var(--text-faint)", fontSize: 13 }}>
          No completed trips yet
        </div>
      ) : (
        <table className="grid-table" style={{ marginBottom: 40 }}>
          <thead>
            <tr>
              <th>Trip Ref</th>
              <th>Date</th>
              <th>Account</th>
              <th>Driver</th>
              <th>Fare</th>
              <th>Note</th>
            </tr>
          </thead>
          <tbody>
            {allCompleted.map(o => (
              <tr key={o.id}>
                <td className="mono" style={{ color: "var(--text-dim)", fontSize: 12 }}>
                  {o.id.slice(0, 12).toUpperCase()}
                </td>
                <td style={{ fontSize: 12, color: "var(--text-dim)" }}>
                  {o.completedAt ? formatTZDate(o.completedAt, tz) : "—"}
                </td>
                <td style={{ fontSize: 13, color: "var(--text)" }}>{o.account.name}</td>
                <td style={{ fontSize: 13, color: o.driver ? "var(--text)" : "var(--text-faint)" }}>
                  {o.driver ? `${o.driver.firstName} ${o.driver.lastName}` : "—"}
                </td>
                <td className="mono" style={{ fontSize: 13, color: o.fareAmount != null ? "var(--text)" : "var(--text-faint)" }}>
                  {fmtCurrency(o.fareAmount, o.fareCurrency ?? "SGD")}
                </td>
                <td style={{ fontSize: 12, color: "var(--text-faint)" }}>
                  {o.fareNote ?? "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* WhatsApp usage section */}
      <div style={{ borderTop: "1px solid var(--border)", paddingTop: 32, marginTop: 8 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 20 }}>
          <span className="panel-title">WhatsApp Messages</span>
          <span style={{ fontSize: 11, color: "var(--text-faint)" }}>{periodLabel(monthStart)}</span>
        </div>

        {waSent === 0 ? (
          <div style={{ color: "var(--text-faint)", fontSize: 13, padding: "24px 0" }}>
            No WhatsApp messages sent this month
          </div>
        ) : (
          <>
            {/* Summary strip */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 24 }}>
              <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, padding: "12px 16px" }}>
                <p style={{ fontSize: 10, color: "var(--text-faint)", textTransform: "uppercase", letterSpacing: "0.7px", fontWeight: 700, marginBottom: 4 }}>Sent</p>
                <p className="mono" style={{ fontSize: 20, fontWeight: 600, color: "var(--text)" }}>{waSent}</p>
              </div>
              <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, padding: "12px 16px" }}>
                <p style={{ fontSize: 10, color: "var(--text-faint)", textTransform: "uppercase", letterSpacing: "0.7px", fontWeight: 700, marginBottom: 4 }}>Delivered</p>
                <p className="mono" style={{ fontSize: 20, fontWeight: 600, color: "var(--text)" }}>{waDelivered}</p>
              </div>
              <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, padding: "12px 16px" }}>
                <p style={{ fontSize: 10, color: "var(--text-faint)", textTransform: "uppercase", letterSpacing: "0.7px", fontWeight: 700, marginBottom: 4 }}>Billable</p>
                <p className="mono" style={{ fontSize: 20, fontWeight: 600, color: "var(--text)" }}>{waBillable}</p>
              </div>
            </div>

            {/* Per-reservation breakdown */}
            {perOrderRows.length > 0 && (
              <>
                <p style={{ fontSize: 11, color: "var(--text-faint)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: 12 }}>
                  Per Reservation
                </p>
                <table className="grid-table">
                  <thead>
                    <tr>
                      <th>Job Ref</th>
                      <th>Date</th>
                      <th>Messages</th>
                    </tr>
                  </thead>
                  <tbody>
                    {perOrderRows.map(row => (
                      <tr key={row.orderId}>
                        <td className="mono" style={{ fontSize: 12, color: "var(--text-dim)" }}>{row.ref}</td>
                        <td style={{ fontSize: 12, color: "var(--text-dim)" }}>
                          {row.pickupTime ? formatTZDate(row.pickupTime, tz) : "—"}
                        </td>
                        <td className="mono" style={{ fontSize: 13, color: "var(--text)" }}>{row.count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
