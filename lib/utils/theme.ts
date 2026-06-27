export type BgMode = "dark" | "light";

export interface StoredTheme {
  bg: BgMode;
  accent: string;
}

// Written on every saveTheme() so the FOUC script can read it without knowing tenantId
const LAST_THEME_KEY = "lypx_last_theme";

function modeKey(tenantId: string): string {
  return `lypx_theme_${tenantId}_mode`;
}
function accentKey(tenantId: string): string {
  return `lypx_theme_${tenantId}_accent`;
}

export const DEFAULT_ACCENT = "#E5A93C";
export const DEFAULT_ACCENT_DIM = "#3A2F1A";

export const DARK_TOKENS: Record<string, string> = {
  // Spec-canonical custom properties
  "--bg-primary":    "#0a0a0a",
  "--bg-secondary":  "#111111",
  "--text-primary":  "#ffffff",
  "--text-secondary":"#8a8a93",
  "--menu-bg":       "#1a1a1a",
  "--menu-text":     "#ffffff",
  // Existing tokens (backward compat — components still reference these)
  "--bg":             "#0a0a0a",
  "--surface":        "#1b1b1f",
  "--surface-raised": "#202024",
  "--border":         "#2c2c35",
  "--text":           "#ffffff",
  "--text-dim":       "#8a8a93",
  "--text-faint":     "#55555e",
};

export const LIGHT_TOKENS: Record<string, string> = {
  // Spec-canonical custom properties
  "--bg-primary":    "#ffffff",
  "--bg-secondary":  "#f5f5f5",
  "--text-primary":  "#0a0a0a",
  "--text-secondary":"#555560",
  "--menu-bg":       "#f0f0f0",
  "--menu-text":     "#0a0a0a",
  // Existing tokens
  "--bg":             "#ffffff",
  "--surface":        "#f5f5f7",
  "--surface-raised": "#ebebef",
  "--border":         "#e0e0e8",
  "--text":           "#0a0a0f",
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
  const d = document.documentElement;
  d.style.setProperty("--accent", accent);
  d.style.setProperty("--accent-color", accent);
  d.style.setProperty("--accent-dim", dim);
  d.style.setProperty("--primary", accent);
  d.style.setProperty("--ring", accent);
}

export function applyTheme(mode: BgMode, accent: string): void {
  applyBackground(mode);
  applyAccent(accent, mode);
}

export function getStoredTheme(tenantId?: string): StoredTheme | null {
  if (typeof localStorage === "undefined") return null;
  try {
    if (tenantId) {
      const bg = localStorage.getItem(modeKey(tenantId)) as BgMode | null;
      const accent = localStorage.getItem(accentKey(tenantId));
      if (bg && accent) return { bg, accent };
    }
    // Fallback: last-used theme (written by saveTheme, read by FOUC script)
    const raw = localStorage.getItem(LAST_THEME_KEY);
    return raw ? (JSON.parse(raw) as StoredTheme) : null;
  } catch {
    return null;
  }
}

export function saveTheme(bg: BgMode, accent: string, tenantId?: string): void {
  if (typeof localStorage === "undefined") return;
  if (tenantId) {
    localStorage.setItem(modeKey(tenantId), bg);
    localStorage.setItem(accentKey(tenantId), accent);
  }
  // Always update the combined fallback so the FOUC script can read it
  localStorage.setItem(LAST_THEME_KEY, JSON.stringify({ bg, accent }));
}
