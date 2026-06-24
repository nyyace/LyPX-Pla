export function isValidUEN(uen: string): boolean {
  const cleaned = uen.trim().toUpperCase();
  return (
    /^[0-9]{8}[A-Z]$/.test(cleaned) ||       // Local company (e.g. 201234567K)
    /^[A-Z][0-9]{8}[A-Z]$/.test(cleaned) ||  // Foreign entity / govt body
    /^[0-9]{9}[A-Z]$/.test(cleaned)           // Other registered entity
  );
}

export function formatUEN(uen: string): string {
  return uen.trim().toUpperCase();
}
