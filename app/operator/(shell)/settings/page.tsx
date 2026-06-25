import { withAuth } from "@workos-inc/authkit-nextjs";
import { getOperatorTenant } from "@/lib/utils/operator";
import { redirect } from "next/navigation";
import { OperatorSettingsForm } from "@/components/lypx/OperatorSettingsForm";
import { getPresignedUrl } from "@/lib/r2";

export default async function OperatorSettingsPage() {
  const { user } = await withAuth({ ensureSignedIn: true });
  const tenant = await getOperatorTenant(user.id);
  if (!tenant) redirect("/operator/dispatch");

  const currentAccent = tenant.preference?.accentColour ?? "#E5A93C";
  const currentTimezone = tenant.preference?.timezone ?? "Asia/Singapore";

  let currentLogoUrl: string | null = null;
  const { R2_PUBLIC_URL } = process.env;
  if (tenant.preference?.logoKey) {
    if (R2_PUBLIC_URL) {
      currentLogoUrl = `${R2_PUBLIC_URL.replace(/\/$/, "")}/${tenant.preference.logoKey}`;
    } else {
      try {
        currentLogoUrl = await getPresignedUrl(tenant.preference.logoKey, 3600);
      } catch {
        currentLogoUrl = null;
      }
    }
  }

  return (
    <div style={{ padding: "32px 40px", maxWidth: 560 }}>
      <p className="panel-title" style={{ marginBottom: 28 }}>Settings</p>
      <OperatorSettingsForm
        tenantId={tenant.id}
        currentTimezone={currentTimezone}
        currentAccent={currentAccent}
        currentLogoUrl={currentLogoUrl}
        name={tenant.name}
        contactName={tenant.contactName}
        contactEmail={tenant.contactEmail}
        contactPhone={tenant.contactPhone}
      />
    </div>
  );
}
