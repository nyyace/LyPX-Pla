export type BgMode = "dark" | "light";

export interface StoredTheme {
  bg: BgMode;
  accent: string;
}

const LEGACY_THEME_KEY = "lypx_operator_theme";
// Written on every saveTheme() so the FOUC script can read it without knowing tenantId
const LAST_THEME_KEY = "lypx_last_theme";

function resolveKey(tenantId?: string): string {
  return tenantId ? `theme_${tenantId}` : LEGACY_THEME_KEY;
}

export const DEFAULT_ACCENT = "#E5A93C";
export const DEFAULT_ACCENT_DIM = "#3A2F1A";

export const DARK_TOKENS: Record<string, string> = {
  "--bg":             "#0F0F11",
  "--surface":        "#1B1B1F",
  "--surface-raised": "#202024",
  "--border":         "#2C2C35",
  "--text":           "#FFFFFF",
  "--text-dim":       "#8A8A93",
  "--text-faint":     "#55555E",
};

export const LIGHT_TOKENS: Record<string, string> = {
  "--bg":             "#FFFFFF",
  "--surface":        "#F5F5F7",
  "--surface-raised": "#EBEBEF",
  "--border":         "#E0E0E8",
  "--text":           "#0A0A0F",
  "--text-dim":       "#555560",
  "--text-faint":     "#999999",
};

export function computeAccentDim(hex: string, mode: BgMode = "dark"): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const bg = mode === "dark" ? 0x0f : 0xf5;
  const blend = mode === "dark" ? 0.22 : 0.18;
  const dr = Math.round(bg + (r - bg) * blend).toString(16).padStart(2, "0");
  const dg = Math.round(bg + (g - bg) * blend).toString(16).padStart(2, "0");
  const db = Math.round(bg + (b - bg) * blend).toString(16).padStart(2, "0");
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

export function applyBackground(mode: BgMode): void {
  if (typeof document === "undefined") return;
  const tokens = mode === "dark" ? DARK_TOKENS : LIGHT_TOKENS;
  const d = document.documentElement;
  Object.entries(tokens).forEach(([k, v]) => d.style.setProperty(k, v));
}

export function applyAccent(accent: string, mode: BgMode = "dark"): void {
  if (typeof document === "undefined") return;
  const dim = computeAccentDim(accent, mode);
  document.documentElement.style.setProperty("--accent", accent);
  document.documentElement.style.setProperty("--accent-dim", dim);
}

export function applyTheme(mode: BgMode, accent: string): void {
  applyBackground(mode);
  applyAccent(accent, mode);
}

export function getStoredTheme(tenantId?: string): StoredTheme | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(resolveKey(tenantId));
    return raw ? (JSON.parse(raw) as StoredTheme) : null;
  } catch {
    return null;
  }
}

export function saveTheme(bg: BgMode, accent: string, tenantId?: string): void {
  if (typeof localStorage === "undefined") return;
  const value = JSON.stringify({ bg, accent });
  localStorage.setItem(resolveKey(tenantId), value);
  localStorage.setItem(LAST_THEME_KEY, value);
}
