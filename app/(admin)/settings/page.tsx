import { withAuth } from "@workos-inc/authkit-nextjs";
import { getUserTimezone } from "@/lib/utils/timezone";
import { prisma } from "@/lib/prisma";
import { workos } from "@/lib/workos/auth";
import { AdminSettingsForm } from "@/components/admin/AdminSettingsForm";

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

  return (
    <div style={{ padding: "32px 40px", maxWidth: 560 }}>
      <p className="panel-title" style={{ marginBottom: 28 }}>Settings</p>
      <AdminSettingsForm currentTimezone={timezone} configs={configs} />
    </div>
  );
}
