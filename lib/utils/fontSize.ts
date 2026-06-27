export type FontSizePref = "small" | "medium" | "large";

const ZOOM: Record<FontSizePref, string> = { small: "0.9", medium: "1", large: "1.1" };
const LAST_KEY = "lypx_font_last";

function userKey(userId: string) {
  return `lypx_font_${userId}`;
}

export function applyFontSize(size: FontSizePref): void {
  if (typeof document === "undefined") return;
  document.documentElement.style.setProperty("--ui-zoom", ZOOM[size]);
}

export function saveFontSize(size: FontSizePref, userId: string): void {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(userKey(userId), size);
  localStorage.setItem(LAST_KEY, size);
}

export function getStoredFontSize(userId: string): FontSizePref {
  if (typeof localStorage === "undefined") return "medium";
  try {
    const v = localStorage.getItem(userKey(userId)) ?? localStorage.getItem(LAST_KEY);
    if (v === "small" || v === "medium" || v === "large") return v;
  } catch {}
  return "medium";
}
