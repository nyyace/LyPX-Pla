// Run: npx tsx lib/whatsapp/verifySignature.test.ts
// No test framework wired into this project yet — plain assertions + tsx,
// matching how prisma/seed.ts is already run.
import assert from "node:assert";
import { createHmac } from "node:crypto";
import { verifyMetaWebhookSignature } from "./verifySignature";

const rawBody = JSON.stringify({ entry: [{ changes: [{ field: "messages" }] }] });
const secret = "test_app_secret";
const validSignature = "sha256=" + createHmac("sha256", secret).update(rawBody).digest("hex");

// Fail-closed: secret unset or empty must reject, never fall through.
assert.strictEqual(
  verifyMetaWebhookSignature(rawBody, validSignature, undefined),
  false,
  "must reject when META_APP_SECRET is undefined, even with a valid-looking signature"
);
assert.strictEqual(
  verifyMetaWebhookSignature(rawBody, validSignature, ""),
  false,
  "must reject when META_APP_SECRET is an empty string"
);

// Missing signature header must reject.
assert.strictEqual(
  verifyMetaWebhookSignature(rawBody, null, secret),
  false,
  "must reject when the signature header is missing"
);

// Malformed header (no sha256= prefix) must reject.
assert.strictEqual(
  verifyMetaWebhookSignature(rawBody, "not-a-real-signature", secret),
  false,
  "must reject a malformed signature header"
);

// Wrong secret must reject.
assert.strictEqual(
  verifyMetaWebhookSignature(rawBody, validSignature, "wrong_secret"),
  false,
  "must reject when the signature was computed with a different secret"
);

// Tampered body must reject (signature no longer matches).
assert.strictEqual(
  verifyMetaWebhookSignature(rawBody + "tampered", validSignature, secret),
  false,
  "must reject when the body doesn't match what was signed"
);

// Correct secret + correct signature must accept.
assert.strictEqual(
  verifyMetaWebhookSignature(rawBody, validSignature, secret),
  true,
  "must accept a correctly-signed request with the right secret"
);

console.log("PASS: all verifyMetaWebhookSignature cases, including fail-closed on unset/empty secret");
