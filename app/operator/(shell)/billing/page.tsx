import { prisma } from "@/lib/prisma";
import { withAuth } from "@workos-inc/authkit-nextjs";
import { getOperatorTenant } from "@/lib/utils/operator";
import { getUserTimezone } from "@/lib/utils/timezone";
import { redirect } from "next/navigation";
import { formatTZDate, DEFAULT_TIMEZONE } from "@/lib/utils/date";

export default async function OperatorBillingPage() {
  const { user } = await withAuth({ ensureSignedIn: true });
  const tenant = await getOperatorTenant(user.id);
  if (!tenant) redirect("/operator/dispatch");

  const tz = await getUserTimezone(user.id);

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [monthOrders, allCompleted] = await Promise.all([
    prisma.order.count({ where: { tenantId: tenant.id, status: "completed", completedAt: { gte: monthStart } } }),
    prisma.order.findMany({
      where: { tenantId: tenant.id, status: "completed" },
      orderBy: { completedAt: "desc" },
      take: 50,
      include: {
        account: { select: { name: true } },
        driver: { select: { firstName: true, lastName: true } },
      },
    }),
  ]);

  return (
    <div style={{ padding: "20px 24px" }}>
      {/* Summary strip */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
        {[
          { label: "This Month Revenue", value: "—", note: "Phase 2.2" },
          { label: "Outstanding",        value: "—", note: "Phase 2.2" },
          { label: "Trips Completed",    value: monthOrders.toString(), note: "this month" },
          { label: "Driver Payouts",     value: "—", note: "Phase 2.3" },
        ].map(s => (
          <div key={s.label} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, padding: "14px 18px" }}>
            <p style={{ fontSize: 10, color: "var(--text-faint)", textTransform: "uppercase", letterSpacing: "0.7px", fontWeight: 700, marginBottom: 6 }}>
              {s.label}
            </p>
            <p className="mono" style={{ fontSize: 22, fontWeight: 600, color: s.value === "—" ? "var(--text-faint)" : "var(--text)" }}>
              {s.value}
            </p>
            <p style={{ fontSize: 10, color: "var(--text-faint)", marginTop: 4 }}>{s.note}</p>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <span className="panel-title">Revenue Ledger</span>
        <span style={{ fontSize: 11, color: "var(--text-faint)", background: "var(--surface-raised)", border: "1px solid var(--border)", borderRadius: 4, padding: "3px 10px" }}>
          Revenue tracking in Phase 2.2
        </span>
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
              <th>Amount</th>
              <th>Driver Reward</th>
              <th>Status</th>
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
                <td className="mono" style={{ fontSize: 13, color: "var(--text-faint)" }}>—</td>
                <td className="mono" style={{ fontSize: 13, color: "var(--text-faint)" }}>—</td>
                <td><span className="chip chip-green">PAID</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
