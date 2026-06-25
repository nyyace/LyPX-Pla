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

export default async function OperatorBillingPage() {
  const { user } = await withAuth({ ensureSignedIn: true });
  const tenant = await getOperatorTenant(user.id);
  if (!tenant) redirect("/operator/dispatch");

  const tz = await getUserTimezone(user.id);

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [monthOrders, allCompleted] = await Promise.all([
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
  ]);

  const monthRevenue = monthOrders.reduce((sum, o) => sum + (o.fareAmount ?? 0), 0);
  const hasRevenue = monthOrders.some(o => o.fareAmount != null);

  return (
    <div style={{ padding: "20px 24px" }}>
      {/* Summary strip */}
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

      <div style={{ display: "flex", alignItems: "center", marginBottom: 16 }}>
        <span className="panel-title">Revenue Ledger</span>
      </div>

      {allCompleted.length === 0 ? (
        <div style={{ textAlign: "center", padding: "64px 0", color: "var(--text-faint)", fontSize: 13 }}>
          No completed trips yet
        </div>
      ) : (
        <table className="grid-table">
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
    </div>
  );
}
