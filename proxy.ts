import { authkitProxy } from "@workos-inc/authkit-nextjs";

export default authkitProxy({
  middlewareAuth: {
    enabled: true,
    unauthenticatedPaths: [
      "/",
      "/callback",
      "/api/auth/signin",
      "/onboard",
      "/api/onboarding/otp/send",
      "/api/onboarding/otp/verify",
      "/api/onboarding/submit",
      "/api/cron/compliance-sweep",
      "/api/cron/expire-claims",
    ],
  },
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
