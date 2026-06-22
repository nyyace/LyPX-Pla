import { withAuth } from "@workos-inc/authkit-nextjs";
import { getUserTimezone } from "@/lib/utils/timezone";
import { TimezoneSelector } from "@/components/settings/TimezoneSelector";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function SettingsPage() {
  const { user } = await withAuth({ ensureSignedIn: true });
  const timezone = await getUserTimezone(user.id);

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
    </div>
  );
}
