/**
 * Normalize a phone number to E.164 format.
 * DEFAULT_COUNTRY_CODE is +65 (Singapore) — move to platform settings for multi-country.
 * Handles: 91234567, 6591234567, +6591234567, "65 9123 4567", "+65 9123 4567", and any
 * number carrying a longer international prefix (e.g. Malaysia +60...).
 * Returns null if the input cannot be normalised.
 */
export function normalizePhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");
  if (digits.length < 8) return null;

  // Meta sends without +, already has country code: 6591234567
  // or caller already passed +65... — strip the + above
  if (digits.startsWith("65") && digits.length === 10) {
    return `+${digits}`;
  }
  // 8-digit Singapore local number
  if (digits.length === 8 && /^[689]/.test(digits)) {
    return `+65${digits}`;
  }
  // Any other number already carrying a country code prefix
  if (digits.length > 10) {
    return `+${digits}`;
  }
  return null;
}
