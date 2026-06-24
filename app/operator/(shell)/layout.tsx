import { withAuth } from "@workos-inc/authkit-nextjs";
import { redirect } from "next/navigation";
import { getOperatorTenant } from "@/lib/utils/operator";
import { OperatorShell } from "@/components/lypx/OperatorShell";
import { prisma } from "@/lib/prisma";

export default async function OperatorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = await withAuth({ ensureSignedIn: true });
  if (!user) redirect("/");

  const tenant = await getOperatorTenant(user.id);

  if (!tenant) {
    return (
      <div style={{ background: "var(--bg)", height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 12 }}>
        <span className="brand-mark" style={{ fontSize: 24 }}>LyPX</span>
        <p style={{ color: "var(--text-dim)", fontSize: 14 }}>
          Your account is not linked to an operator tenant.
        </p>
        <p style={{ color: "var(--text-faint)", fontSize: 12 }}>
          Contact your LyPX administrator to set up operator access.
        </p>
      </div>
    );
  }

  // Suspended operators see a notice page
  if (tenant.status === "suspended") {
    redirect("/operator/suspended");
  }

  // First login after invite — auto-activate
  if (tenant.status === "invited") {
    await prisma.$transaction(async (tx) => {
      await tx.tenant.update({
        where: { id: tenant.id },
        data: { status: "active", activatedAt: new Date() },
      });
      await tx.auditLog.create({
        data: {
          entityType: "tenant",
          entityId: tenant.id,
          action: "operator_activated",
          actorId: user.id,
          metadata: { triggeredBy: "first_login" },
        },
      });
    });
  }

  const initials = [user.firstName?.[0], user.lastName?.[0]]
    .filter(Boolean)
    .join("")
    .toUpperCase() || "?";

  const accent = tenant.preference?.accentColour ?? "#E5A93C";

  return (
    <OperatorShell
      tenantId={tenant.id}
      tenantName={tenant.name}
      userInitials={initials}
      accent={accent}
    >
      {children}
    </OperatorShell>
  );
}
