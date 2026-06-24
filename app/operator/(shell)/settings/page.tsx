import { withAuth } from "@workos-inc/authkit-nextjs";
import { getOperatorTenant } from "@/lib/utils/operator";
import { redirect } from "next/navigation";
import { AccentColourPicker } from "@/components/lypx/AccentColourPicker";
import { LogoUpload } from "@/components/lypx/LogoUpload";
import { OperatorTimezoneSelector } from "@/components/lypx/OperatorTimezoneSelector";
import { getPresignedUrl } from "@/lib/r2";

export default async function OperatorSettingsPage() {
  const { user } = await withAuth({ ensureSignedIn: true });
  const tenant = await getOperatorTenant(user.id);
  if (!tenant) redirect("/operator/dispatch");

  const currentAccent = tenant.preference?.accentColour ?? "#E5A93C";
  const currentTimezone = tenant.preference?.timezone ?? "Asia/Singapore";

  // Resolve logo URL for the upload component preview
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

  const sectionLabel: React.CSSProperties = {
    fontSize: 11, color: "var(--text-faint)", fontWeight: 500,
    textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: 16,
  };

  return (
    <div style={{ padding: "32px 40px", maxWidth: 560 }}>
      <p className="panel-title" style={{ marginBottom: 28 }}>Settings</p>

      {/* Logo */}
      <section style={{ marginBottom: 36 }}>
        <p style={sectionLabel}>Branding</p>
        <LogoUpload currentLogoUrl={currentLogoUrl} />
      </section>

      {/* Display */}
      <section style={{ marginBottom: 36 }}>
        <p style={sectionLabel}>Display</p>
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, padding: 24 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.7px", marginBottom: 6 }}>
            Timezone
          </p>
          <p style={{ fontSize: 13, color: "var(--text-faint)", marginBottom: 16 }}>
            Used for displaying pickup times and reservation dates.
          </p>
          <OperatorTimezoneSelector tenantId={tenant.id} currentTimezone={currentTimezone} />
        </div>
      </section>

      {/* Appearance */}
      <section style={{ marginBottom: 36 }}>
        <p style={sectionLabel}>Appearance</p>
        <AccentColourPicker tenantId={tenant.id} currentAccent={currentAccent} />
      </section>
    </div>
  );
}
