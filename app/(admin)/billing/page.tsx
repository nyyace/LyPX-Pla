import { prisma } from "@/lib/prisma";
import { withAuth } from "@workos-inc/authkit-nextjs";
import { getUserTimezone } from "@/lib/utils/timezone";
import { AdminBillingClient, type BillingRow } from "@/components/admin/AdminBillingClient";

export default async function AdminBillingPage() {
  const { user } = await withAuth({ ensureSignedIn: true });
  const tz = await getUserTimezone(user.id);

  const orders = await prisma.order.findMany({
    where: {
      status: "completed",
      account: {
        accountType: { in: ["individual", "business_entity"] },
      },
    },
    include: {
      account: { select: { name: true, accountType: true } },
    },
    orderBy: { completedAt: "desc" },
    take: 1000,
  });

  const rows: BillingRow[] = orders.map((o) => ({
    id:                   o.id,
    jobReference:         o.jobReference ?? o.id.slice(0, 12).toUpperCase(),
    completedAt:          o.completedAt?.toISOString() ?? null,
    pickupTime:           o.pickupTime.toISOString(),
    accountName:          o.account.name,
    accountType:          o.account.accountType,
    fareAmount:           o.fareAmount,
    fareCurrency:         o.fareCurrency ?? "SGD",
    fareNote:             o.fareNote ?? null,
    driverPayableAmount:  o.driverPayableAmount,
  }));

  return <AdminBillingClient rows={rows} timezone={tz} />;
}
