export const VEHICLE_CLASSES = [
  { value: "standard_sedan",           label: "Standard Sedan" },
  { value: "standard_mpv_nve",         label: "Standard MPV (NVE)" },
  { value: "executive_sedan_eclass",   label: "Executive Sedan (E-Class)" },
  { value: "luxury_sedan_sclass",      label: "Luxury Sedan (S-Class)" },
  { value: "executive_mpv_avf",        label: "Executive MPV (AVF)" },
  { value: "prestige_mpv_lexus",       label: "Prestige MPV (Lexus)" },
  { value: "luxury_executive_van_vvv", label: "Luxury Executive Van (VVV)" },
  { value: "group_van_combi",          label: "Group Van (Combi)" },
  { value: "prestige_collection",      label: "Prestige Collection (Rolls Royce, Maybach)" },
  { value: "electric_executive_mpv",   label: "Electric Executive MPV" },
] as const;

export const VEHICLE_CLASS_LABELS: Record<string, string> = Object.fromEntries(
  VEHICLE_CLASSES.map(c => [c.value, c.label])
);
