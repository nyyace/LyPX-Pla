import { authkitMiddleware } from "@workos-inc/authkit-nextjs";

export default authkitMiddleware({
  middlewareAuth: {
    enabled: true,
    unauthenticatedPaths: [
      // Driver self-onboarding (public)
      "/onboard",
      "/onboard/:path*",
      // WorkOS callback
      "/callback",
      // Cron jobs — secured by x-cron-secret header, not session
      "/api/cron/:path*",
      // Webhooks — must be fully public (no session expected from external callers)
      "/api/webhooks/:path*",
      // Driver onboarding API routes
      "/api/onboard/:path*",
      "/api/phone-verify/:path*",
    ],
  },
});

export const config = {
  // Run middleware on all routes except Next.js internals and static files.
  // This intentionally includes /api/webhooks/* so the session-refresh
  // middleware runs, but unauthenticatedPaths above ensures no redirect fires.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
