import { withAuth } from "@workos-inc/authkit-nextjs";
import { getUserTimezone } from "@/lib/utils/timezone";
import { TimezoneSelector } from "@/components/settings/TimezoneSelector";
import { prisma } from "@/lib/prisma";
import { workos } from "@/lib/workos/auth";
import { MarketplaceConfigSection } from "@/components/settings/MarketplaceConfigSection";
import { AdminAppearanceSection } from "@/components/admin/AdminAppearanceSection";

async function resolveAdminName(userId: string | null): Promise<string | null> {
  if (!userId) return null;
  try {
    const u = await workos.userManagement.getUser(userId);
    return `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() || u.email;
  } catch {
    return null;
  }
}

export default async function SettingsPage() {
  const { user } = await withAuth({ ensureSignedIn: true });
  const [timezone, rawConfigs] = await Promise.all([
    getUserTimezone(user.id),
    prisma.platformConfig.findMany({ orderBy: { key: "asc" } }),
  ]);

  const uniqueUpdaterIds = [...new Set(rawConfigs.map((c) => c.updatedBy).filter(Boolean))] as string[];
  const nameEntries = await Promise.all(
    uniqueUpdaterIds.map(async (id) => [id, await resolveAdminName(id)] as const)
  );
  const nameMap = Object.fromEntries(nameEntries);

  const configs = rawConfigs.map((c) => ({
    key: c.key,
    value: c.value,
    updatedAt: c.updatedAt.toISOString(),
    updatedByName: c.updatedBy ? (nameMap[c.updatedBy] ?? null) : null,
  }));

  const card: React.CSSProperties = {
    background: "var(--surface)",
    border: "1px solid var(--border)",
    borderRadius: 8,
    padding: 24,
    marginBottom: 24,
  };

  return (
    <div style={{ padding: "32px 40px", maxWidth: 560 }}>
      <p className="panel-title" style={{ marginBottom: 28 }}>Settings</p>

      {/* Appearance */}
      <AdminAppearanceSection />

      {/* Display Timezone */}
      <section style={{ marginBottom: 32 }}>
        <p style={{
          fontSize: 11, color: "var(--text-faint)", fontWeight: 500,
          textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: 12,
        }}>
          Display
        </p>
        <div style={card}>
          <p style={{ fontSize: 11, fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.7px", marginBottom: 6 }}>
            Timezone
          </p>
          <p style={{ fontSize: 13, color: "var(--text-faint)", marginBottom: 16 }}>
            All timestamps in the Admin Console will display in this timezone. Dates are stored in UTC — only the display changes.
          </p>
          <TimezoneSelector currentTimezone={timezone} />
        </div>
      </section>

      {/* Marketplace Config */}
      <MarketplaceConfigSection configs={configs} />
    </div>
  );
}
