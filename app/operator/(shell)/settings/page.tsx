import { withAuth } from "@workos-inc/authkit-nextjs";
import { getOperatorTenant } from "@/lib/utils/operator";
import { redirect } from "next/navigation";
import { AccentColourPicker } from "@/components/lypx/AccentColourPicker";
import { LogoUpload } from "@/components/lypx/LogoUpload";
import { OperatorTimezoneSelector } from "@/components/lypx/OperatorTimezoneSelector";
import { OperatorAccountSection } from "@/components/lypx/OperatorAccountSection";
import { WhatsAppSettings } from "@/components/lypx/WhatsAppSettings";
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

  const sectionLabel: React.CSSProperties = {
    fontSize: 11, color: "var(--text-faint)", fontWeight: 500,
    textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: 16,
  };
  const card: React.CSSProperties = {
    background: "var(--surface)", border: "1px solid var(--border)",
    borderRadius: 8, padding: 24,
  };

  return (
    <div style={{ padding: "32px 40px", maxWidth: 560 }}>
      <p className="panel-title" style={{ marginBottom: 28 }}>Settings</p>

      {/* Branding — logo (immediate) + accent colour (Save Branding) */}
      <section style={{ marginBottom: 36 }}>
        <p style={sectionLabel}>Branding</p>
        <div style={card}>
          <p style={{ fontSize: 11, fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.7px", marginBottom: 6 }}>
            Logo
          </p>
          <p style={{ fontSize: 13, color: "var(--text-faint)", marginBottom: 16 }}>
            Appears in the top navigation bar. Upload triggers immediately on file selection.
          </p>
          <LogoUpload currentLogoUrl={currentLogoUrl} />

          <div style={{ borderTop: "1px solid var(--border)", margin: "24px 0" }} />

          <AccentColourPicker
            tenantId={tenant.id}
            currentAccent={currentAccent}
            saveLabel="Save Branding"
          />
        </div>
      </section>

      {/* Display — timezone */}
      <section style={{ marginBottom: 36 }}>
        <p style={sectionLabel}>Display</p>
        <div style={card}>
          <p style={{ fontSize: 11, fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.7px", marginBottom: 6 }}>
            Timezone
          </p>
          <p style={{ fontSize: 13, color: "var(--text-faint)", marginBottom: 16 }}>
            Used for displaying pickup times and reservation dates.
          </p>
          <OperatorTimezoneSelector tenantId={tenant.id} currentTimezone={currentTimezone} />
        </div>
      </section>

      {/* Account — company and contact details */}
      <section style={{ marginBottom: 36 }}>
        <p style={sectionLabel}>Account</p>
        <div style={card}>
          <p style={{ fontSize: 11, fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.7px", marginBottom: 6 }}>
            Company Details
          </p>
          <p style={{ fontSize: 13, color: "var(--text-faint)", marginBottom: 16 }}>
            Contact phone is used as the requestor WhatsApp number for trip notifications.
          </p>
          <OperatorAccountSection
            name={tenant.name}
            contactName={tenant.contactName}
            contactEmail={tenant.contactEmail}
            contactPhone={tenant.contactPhone}
          />
        </div>
      </section>

      {/* WhatsApp */}
      <section style={{ marginBottom: 36 }}>
        <p style={sectionLabel}>WhatsApp</p>
        <WhatsAppSettings />
      </section>
    </div>
  );
}
