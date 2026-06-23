import { signOut } from "@workos-inc/authkit-nextjs";
import { headers } from "next/headers";

export async function POST() {
  const headersList = await headers();
  const host = headersList.get("host") ?? "";
  const proto = host.includes("localhost") ? "http" : "https";
  return signOut({ returnTo: `${proto}://${host}/` });
}
