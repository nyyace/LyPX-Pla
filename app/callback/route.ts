import { handleAuth } from "@workos-inc/authkit-nextjs";
import { NextResponse } from "next/server";

// Railway runs in a container — request.url is localhost:8080 internally.
// baseURL tells handleAuth() to use the public domain for post-auth redirects.
const BASE_URL = process.env.RAILWAY_PUBLIC_DOMAIN
  ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
  : "http://localhost:3000";

const handler = handleAuth({
  baseURL: BASE_URL,
  onError: async ({ error, request }) => {
    const err = error instanceof Error ? error : new Error(String(error));
    const url = new URL(request.url);
    const hasCode = !!url.searchParams.get("code");
    const hasState = !!url.searchParams.get("state");

    console.error("[callback error]", {
      message: err.message,
      code: hasCode ? "present" : "missing",
      state: hasState ? "present" : "missing",
      url: url.pathname + url.search,
    });

    // WorkOS redirects here after invitation acceptance without starting a full
    // PKCE flow — there's no code/state to exchange. Redirect to sign-in so the
    // user can get a session now that their account is set up.
    if (
      err.message === "Missing required auth parameter" ||
      err.message.startsWith("Auth cookie missing")
    ) {
      return NextResponse.redirect(new URL("/api/auth/signin", BASE_URL));
    }

    // All other auth errors — return the standard WorkOS error response.
    return NextResponse.json(
      {
        error: {
          message: "Something went wrong",
          description:
            "Couldn't sign in. If you are not sure what happened, please contact your organization admin.",
        },
      },
      { status: 400 }
    );
  },
});

// WorkOS may redirect back via GET (standard OAuth) or POST (form-post response mode).
// Both are valid — export the same handler for each.
export const GET = handler;
export const POST = handler;
