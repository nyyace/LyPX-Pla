/**
 * Normalize an inbound WhatsApp sender number to E.164 format.
 * Meta sends `from` as digits without the leading +, e.g. "6591234567".
 * Handles: 65XXXXXXXX, +65XXXXXXXX, 8XXXXXXX (SG local), or any other
 * country code already present in the digit string.
 * Returns null if the input is empty or too short to be valid.
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
