import { withAuth } from "@workos-inc/authkit-nextjs";
import { getOperatorTenant } from "@/lib/utils/operator";
import { redirect } from "next/navigation";
import { AccentColourPicker } from "@/components/lypx/AccentColourPicker";
import { BgModeToggle } from "@/components/lypx/BgModeToggle";

export default async function OperatorAppearancePage() {
  const { user } = await withAuth({ ensureSignedIn: true });
  const tenant = await getOperatorTenant(user.id);
  if (!tenant) redirect("/operator/dispatch");

  const currentAccent = tenant.preference?.accentColour ?? "#E5A93C";

  return (
    <div style={{ padding: "32px 40px", maxWidth: 560 }}>
      <p className="panel-title" style={{ marginBottom: 24 }}>Appearance</p>
      <BgModeToggle tenantId={tenant.id} />
      <AccentColourPicker tenantId={tenant.id} currentAccent={currentAccent} />
    </div>
  );
}
