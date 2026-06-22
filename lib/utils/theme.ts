export const DEFAULT_ACCENT = "#E5A93C";
export const DEFAULT_ACCENT_DIM = "#3A2F1A";

// Given a hex accent colour, compute its dim (dark-tint) variant
export function computeAccentDim(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const bg = 0x0f; // approx --bg channel
  const dr = Math.round(bg + (r - bg) * 0.22).toString(16).padStart(2, "0");
  const dg = Math.round(bg + (g - bg) * 0.22).toString(16).padStart(2, "0");
  const db = Math.round(bg + (b - bg) * 0.22).toString(16).padStart(2, "0");
  return `#${dr}${dg}${db}`;
}

// Compute an HSL hex from hue (0-360), fixed saturation 75%, lightness 60%
export function hueToAccent(hue: number): string {
  const h = hue / 360;
  const s = 0.75;
  const l = 0.60;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h * 12) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

// Apply accent CSS vars to document root (client-side only)
export function applyAccent(accent: string): void {
  if (typeof document === "undefined") return;
  const dim = computeAccentDim(accent);
  document.documentElement.style.setProperty("--accent", accent);
  document.documentElement.style.setProperty("--accent-dim", dim);
}
