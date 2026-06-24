import { withAuth } from "@workos-inc/authkit-nextjs";
import { redirect } from "next/navigation";
import { getOperatorTenant } from "@/lib/utils/operator";

export default async function RootPage() {
  const { user } = await withAuth();

  if (user) {
    const tenant = await getOperatorTenant(user.id);
    if (tenant) redirect("/operator/dispatch");
    redirect("/dispatch");
  }

  redirect("/api/auth/signin");
}
