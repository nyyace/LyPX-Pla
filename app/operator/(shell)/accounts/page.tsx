import { withAuth } from "@workos-inc/authkit-nextjs";
import { getOperatorTenant } from "@/lib/utils/operator";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";

const segmentLabels: Record<string, string> = {
  hotel: "Hotel", mice: "MICE", tdm: "TDM", dmc: "DMC", corporate_general: "Corporate",
};

function daysLeft(expiryAt: Date): number {
  return Math.max(0, Math.ceil((expiryAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
}

export default async function OperatorAccountsPage() {
  const { user } = await withAuth({ ensureSignedIn: true });
  const tenant = await getOperatorTenant(user.id);
  if (!tenant) redirect("/operator/dispatch");

  const claims = await prisma.accountClaim.findMany({
    where: {
      claimingPartyType: "operator",
      claimingPartyId: tenant.id,
      status: { in: ["claimed", "won"] },
    },
    include: {
      account: { select: { id: true, name: true, uen: true, customerSegment: true } },
    },
    orderBy: { claimedAt: "desc" },
  });

  const colStyle: React.CSSProperties = { padding: "10px 12px", fontSize: 13, color: "var(--text)" };
  const thStyle: React.CSSProperties = { ...colStyle, color: "var(--text-faint)", fontWeight: 500, fontSize: 11, textTransform: "uppercase" as const, letterSpacing: "0.5px", borderBottom: "1px solid var(--border)" };

  return (
    <div style={{ padding: "32px 40px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: "var(--text)", margin: 0 }}>Accounts</h1>
          <p style={{ fontSize: 12, color: "var(--text-dim)", marginTop: 4 }}>Corporate clients you've onboarded</p>
        </div>
        <Link href="/operator/accounts/new">
          <button className="btn-primary" style={{ fontSize: 13, padding: "8px 16px" }}>+ Add Account</button>
        </Link>
      </div>

      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={{ ...thStyle, textAlign: "left" }}>Company</th>
              <th style={{ ...thStyle, textAlign: "left" }}>UEN</th>
              <th style={{ ...thStyle, textAlign: "left" }}>Segment</th>
              <th style={{ ...thStyle, textAlign: "left" }}>Claim</th>
              <th style={{ ...thStyle, textAlign: "left" }}>Expires</th>
            </tr>
          </thead>
          <tbody>
            {claims.length === 0 && (
              <tr>
                <td colSpan={5} style={{ ...colStyle, textAlign: "center", color: "var(--text-faint)", padding: "40px 12px" }}>
                  No accounts yet.{" "}
                  <Link href="/operator/accounts/new" style={{ color: "var(--gold)" }}>Add your first account →</Link>
                </td>
              </tr>
            )}
            {claims.map((c, i) => {
              const days = daysLeft(c.expiryAt);
              const isWon = c.status === "won";
              return (
                <tr key={c.id} style={{ borderTop: i === 0 ? undefined : "1px solid var(--border)" }}>
                  <td style={colStyle}><span style={{ fontWeight: 600 }}>{c.account.name}</span></td>
                  <td style={{ ...colStyle, fontFamily: "monospace", fontSize: 12, color: "var(--text-dim)" }}>{c.account.uen ?? "—"}</td>
                  <td style={{ ...colStyle, color: "var(--text-dim)" }}>{segmentLabels[c.account.customerSegment] ?? c.account.customerSegment}</td>
                  <td style={colStyle}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: isWon ? "#22c55e" : "#f59e0b", border: `1px solid ${isWon ? "#22c55e" : "#f59e0b"}33`, padding: "2px 7px", borderRadius: 3, textTransform: "uppercase" as const, letterSpacing: "0.3px" }}>
                      {c.status}
                    </span>
                  </td>
                  <td style={{ ...colStyle, color: days < 14 ? "#ef4444" : "var(--text-dim)", fontSize: 12 }}>
                    {isWon ? "Protected" : `${days}d left`}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
