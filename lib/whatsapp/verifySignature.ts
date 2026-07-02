import { createHmac, timingSafeEqual } from "crypto";

// Fail-closed by design: any missing/malformed input (secret, header, or a
// length mismatch that would make timingSafeEqual throw) returns false.
// There is no code path here that returns true without a verified HMAC match.
export function verifyMetaWebhookSignature(
  rawBody: string,
  signatureHeader: string | null | undefined,
  appSecret: string | null | undefined
): boolean {
  if (!appSecret) return false;
  if (!signatureHeader?.startsWith("sha256=")) return false;

  const expected = createHmac("sha256", appSecret).update(rawBody).digest("hex");
  const expectedBuf = Buffer.from(expected, "hex");
  const providedBuf = Buffer.from(signatureHeader.slice("sha256=".length), "hex");

  if (expectedBuf.length !== providedBuf.length) return false;
  return timingSafeEqual(expectedBuf, providedBuf);
}
