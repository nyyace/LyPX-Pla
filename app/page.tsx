import { withAuth } from "@workos-inc/authkit-nextjs";
import { redirect } from "next/navigation";

export default async function RootPage() {
  const { user } = await withAuth();

  if (user) redirect("/dashboard");

  redirect("/api/auth/signin");
}
