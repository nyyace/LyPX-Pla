import { withAuth, getSignInUrl } from "@workos-inc/authkit-nextjs";
import { redirect } from "next/navigation";

export default async function RootPage() {
  const { user } = await withAuth();

  if (user) redirect("/dashboard");

  const signInUrl = await getSignInUrl();
  redirect(signInUrl);
}
