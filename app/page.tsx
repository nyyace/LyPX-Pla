import { withAuth } from "@workos-inc/authkit-nextjs";
import { redirect } from "next/navigation";
import { resolveUserRole } from "@/lib/utils/admin";

export default async function RootPage() {
  const { user } = await withAuth();

  if (user) {
    const role = await resolveUserRole(user.id);
    if (role === "operator") redirect("/operator/dispatch");
    if (role === "admin") redirect("/dispatch");
    // signed in but not provisioned in either console
    redirect("/api/auth/signout");
  }

  redirect("/api/auth/signin");
}
