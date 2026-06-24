import { withAuth } from "@workos-inc/authkit-nextjs";
import { getOperatorTenant } from "@/lib/utils/operator";
import { redirect } from "next/navigation";
import { AccentColourPicker } from "@/components/lypx/AccentColourPicker";

export default async function OperatorSettingsPage() {
  const { user } = await withAuth({ ensureSignedIn: true });
  const tenant = await getOperatorTenant(user.id);
  if (!tenant) redirect("/operator/dispatch");

  const currentAccent = tenant.preference?.accentColour ?? "#E5A93C";

  return (
    <div style={{ padding: "32px 40px", maxWidth: 560 }}>
      <p className="panel-title" style={{ marginBottom: 28 }}>Settings</p>

      {/* Appearance */}
      <section style={{ marginBottom: 36 }}>
        <p style={{ fontSize: 11, color: "var(--text-faint)", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: 16 }}>Appearance</p>
        <AccentColourPicker tenantId={tenant.id} currentAccent={currentAccent} />
      </section>
    </div>
  );
}
