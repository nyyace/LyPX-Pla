import { handleAuth } from "@workos-inc/authkit-nextjs";

// Railway runs in a container — request.url is localhost:8080 internally.
// baseURL tells handleAuth() to use the public domain for post-auth redirects.
const BASE_URL = process.env.RAILWAY_PUBLIC_DOMAIN
  ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
  : "http://localhost:3000";

export const GET = handleAuth({ baseURL: BASE_URL });
