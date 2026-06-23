export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json({
    WORKOS_API_KEY: process.env.WORKOS_API_KEY ? `set (${process.env.WORKOS_API_KEY.length} chars, starts: ${process.env.WORKOS_API_KEY.slice(0, 8)})` : "MISSING",
    WORKOS_CLIENT_ID: process.env.WORKOS_CLIENT_ID ? `set (${process.env.WORKOS_CLIENT_ID.length} chars)` : "MISSING",
    WORKOS_COOKIE_PASSWORD: process.env.WORKOS_COOKIE_PASSWORD ? `set (${process.env.WORKOS_COOKIE_PASSWORD.length} chars)` : "MISSING",
    NEXT_PUBLIC_WORKOS_REDIRECT_URI: process.env.NEXT_PUBLIC_WORKOS_REDIRECT_URI ?? "MISSING",
    DATABASE_URL: process.env.DATABASE_URL ? "set" : "MISSING",
    NODE_ENV: process.env.NODE_ENV,
  });
}
