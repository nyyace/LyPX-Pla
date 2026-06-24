import { withAuth } from "@workos-inc/authkit-nextjs";
import { getUserTimezone } from "@/lib/utils/timezone";
import { TimezoneSelector } from "@/components/settings/TimezoneSelector";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { workos } from "@/lib/workos/auth";
import { MarketplaceConfigSection } from "@/components/settings/MarketplaceConfigSection";

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

  // Resolve admin names for updatedBy fields (deduplicated)
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

  return (
    <div className="p-8 max-w-lg">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-white">Settings</h1>
        <p className="text-sm text-gray-500 mt-1">Your personal preferences</p>
      </div>

      <Card className="bg-gray-900 border-gray-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm text-gray-300">Display Timezone</CardTitle>
        </CardHeader>
        <CardContent>
          <TimezoneSelector currentTimezone={timezone} />
        </CardContent>
      </Card>

      <MarketplaceConfigSection configs={configs} />
    </div>
  );
}
