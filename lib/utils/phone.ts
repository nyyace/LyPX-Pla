export function maskPhone(phone: string): string {
  const clean = phone.replace(/\s/g, "");
  if (clean.length <= 4) return "****";
  const countryCodeEnd = Math.max(2, clean.length - 8);
  return clean.slice(0, countryCodeEnd) + "****" + clean.slice(-4);
}
