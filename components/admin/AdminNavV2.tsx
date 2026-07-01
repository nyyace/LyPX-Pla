"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Navigation,
  CalendarDays,
  MessageCircle,
  Users,
  Car,
  ShieldCheck,
  FileText,
  Building,
  Receipt,
  ShoppingCart,
  RefreshCw,
  BarChart2,
  UserCog,
  History,
  Settings,
  ChevronRight,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  badgeKey?: "pendingCompliance";
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: "Operations",
    items: [
      { href: "/dispatch",     label: "Dispatch Centre", icon: Navigation },
      { href: "/orders",       label: "Reservations",    icon: CalendarDays },
      { href: "/whatsapp",     label: "WhatsApp",        icon: MessageCircle },
    ],
  },
  {
    label: "Fleet and Compliance",
    items: [
      { href: "/drivers",          label: "Drivers",          icon: Users },
      { href: "/vehicles",         label: "Vehicles",         icon: Car },
      { href: "/compliance-queue", label: "Compliance Queue", icon: ShieldCheck, badgeKey: "pendingCompliance" },
      { href: "/submissions",      label: "Submissions",      icon: FileText },
    ],
  },
  {
    label: "Accounts and Billing",
    items: [
      { href: "/accounts",          label: "Accounts & Claims", icon: Building },
      { href: "/billing",           label: "Billing",           icon: Receipt },
      { href: "/marketplace",       label: "Marketplace",       icon: ShoppingCart },
      { href: "/takeover-requests", label: "Takeover Requests", icon: RefreshCw },
    ],
  },
  {
    label: "Platform",
    items: [
      { href: "/usage",      label: "Usage",     icon: BarChart2 },
      { href: "/users",      label: "Users",     icon: UserCog },
      { href: "/audit-log",  label: "Audit Log", icon: History },
      { href: "/settings",   label: "Settings",  icon: Settings },
    ],
  },
];

function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(href + "/");
}

function getActiveGroupLabel(pathname: string): string {
  return (
    NAV_GROUPS.find((g) => g.items.some((item) => isActive(pathname, item.href)))?.label ??
    NAV_GROUPS[0].label
  );
}

export function AdminNavV2({ pendingComplianceCount }: { pendingComplianceCount?: number }) {
  const pathname = usePathname();
  const activeGroup = getActiveGroupLabel(pathname);
  const [expandedGroup, setExpandedGroup] = useState(activeGroup);

  // When you navigate to a page in a different group, auto-expand that group
  useEffect(() => {
    setExpandedGroup(activeGroup);
  }, [activeGroup]);

  function handleGroupClick(groupLabel: string, isExpanded: boolean) {
    if (groupLabel === activeGroup) {
      // Active group: always stays expanded; clicking is a no-op
      setExpandedGroup(groupLabel);
    } else if (isExpanded) {
      // Collapse a non-active group back to the active one
      setExpandedGroup(activeGroup);
    } else {
      setExpandedGroup(groupLabel);
    }
  }

  return (
    <nav
      aria-label="Admin navigation"
      style={{
        width: 220,
        flexShrink: 0,
        background: "var(--bg-secondary)",
        borderRight: "1px solid var(--border)",
        overflowY: "auto",
        paddingTop: 12,
        paddingBottom: 24,
      }}
    >
      {NAV_GROUPS.map((group) => {
        const isExpanded = expandedGroup === group.label;
        const groupHasActive = group.items.some((item) => isActive(pathname, item.href));

        return (
          <div key={group.label}>
            {/* Group header */}
            <button
              type="button"
              onClick={() => handleGroupClick(group.label, isExpanded)}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "6px 16px",
                background: "none",
                border: "none",
                cursor: "pointer",
                color: groupHasActive ? "var(--text-dim)" : "var(--text-faint)",
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "0.8px",
                textTransform: "uppercase",
              }}
            >
              <span>{group.label}</span>
              <ChevronRight
                size={12}
                style={{
                  transition: "transform 0.15s ease",
                  transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)",
                  opacity: 0.6,
                }}
              />
            </button>

            {/* Items */}
            {isExpanded && (
              <div style={{ marginBottom: 4 }}>
                {group.items.map((item) => {
                  const active = isActive(pathname, item.href);
                  const Icon = item.icon;
                  const showBadge =
                    item.badgeKey === "pendingCompliance" &&
                    pendingComplianceCount !== undefined &&
                    pendingComplianceCount > 0;

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 8,
                        padding: "6px 16px 6px 14px",
                        margin: "1px 8px",
                        borderRadius: 6,
                        textDecoration: "none",
                        fontSize: 13,
                        fontWeight: active ? 600 : 400,
                        color: active ? "var(--accent)" : "var(--text-dim)",
                        background: active ? "var(--accent-dim)" : "transparent",
                        transition: "background 0.1s ease, color 0.1s ease",
                      }}
                      onMouseEnter={(e) => {
                        if (!active) {
                          (e.currentTarget as HTMLElement).style.background = "var(--surface-raised)";
                          (e.currentTarget as HTMLElement).style.color = "var(--text)";
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!active) {
                          (e.currentTarget as HTMLElement).style.background = "transparent";
                          (e.currentTarget as HTMLElement).style.color = "var(--text-dim)";
                        }
                      }}
                    >
                      <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <Icon size={14} style={{ flexShrink: 0 }} />
                        {item.label}
                      </span>
                      {showBadge && (
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 700,
                            padding: "1px 6px",
                            borderRadius: 20,
                            background: "var(--accent-dim)",
                            color: "var(--accent)",
                            border: "1px solid var(--accent)",
                            minWidth: 18,
                            textAlign: "center",
                          }}
                        >
                          {pendingComplianceCount! > 99 ? "99+" : pendingComplianceCount}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );
}
