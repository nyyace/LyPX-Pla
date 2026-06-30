export type UserRole = "admin" | "operator" | "partner";

export interface TabDef {
  href: string;
  label: string;
  badge?: "gate-queue";
}

export const ADMIN_TABS: TabDef[] = [
  { href: "/dispatch",          label: "Dispatch Centre" },
  { href: "/compliance-queue",  label: "Compliance Queue" },
  { href: "/submissions",       label: "Submissions" },
  { href: "/drivers",           label: "Drivers" },
  { href: "/vehicles",          label: "Vehicles" },
  { href: "/accounts",          label: "Accounts & Claims" },
  { href: "/takeover-requests", label: "Takeover Requests" },
  { href: "/orders",            label: "Reservations" },
  { href: "/marketplace",       label: "Marketplace" },
  { href: "/whatsapp",          label: "WhatsApp" },
  { href: "/usage",             label: "Usage" },
  { href: "/users",             label: "Users" },
  { href: "/audit-log",         label: "Audit Log" },
  { href: "/settings",          label: "Settings" },
];

export const OPERATOR_TABS: TabDef[] = [
  { href: "/operator/dispatch",     label: "Dispatch Centre" },
  { href: "/operator/reservations", label: "Reservations" },
  { href: "/operator/accounts",     label: "Accounts" },
  { href: "/operator/profiles",     label: "Profiles" },
  { href: "/operator/drivers",      label: "Roster" },
  { href: "/operator/gate-queue",   label: "Gate Queue", badge: "gate-queue" },
  { href: "/operator/billing",      label: "Billing Logs" },
  { href: "/operator/settings",     label: "Settings" },
];

export const PARTNER_TABS: TabDef[] = [
  { href: "/partner",          label: "Dashboard" },
  { href: "/partner/bookings", label: "My Bookings" },
  { href: "/partner/billing",  label: "Billing" },
  { href: "/partner/settings", label: "Settings" },
];

export function getTabsForRole(role: UserRole): TabDef[] {
  if (role === "admin") return ADMIN_TABS;
  if (role === "partner") return PARTNER_TABS;
  return OPERATOR_TABS;
}
