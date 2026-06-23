import { signOut } from "@workos-inc/authkit-nextjs";

const PUBLIC_URL = process.env.RAILWAY_PUBLIC_DOMAIN
  ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
  : "http://localhost:3000";

export async function POST() {
  return signOut({ returnTo: PUBLIC_URL });
}
