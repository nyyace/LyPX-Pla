import { withAuth } from "@workos-inc/authkit-nextjs";
import { prisma } from "@/lib/prisma";
import { workos } from "@/lib/workos/auth";
import { NextResponse } from "next/server";
import { isAdminUser } from "@/lib/utils/admin";

// PATCH /api/admin/operators/[id] — update status (active | suspended)
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user } = await withAuth({ ensureSignedIn: true });
  if (!user || !(await isAdminUser(user.id))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const { status } = await req.json() as { status: "active" | "suspended" };

  if (!["active", "suspended"].includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const tenant = await prisma.tenant.findUnique({ where: { id } });
  if (!tenant || tenant.tenantType !== "operator") {
    return NextResponse.json({ error: "Operator not found" }, { status: 404 });
  }

  const actionLabel = status === "suspended" ? "operator_suspended" : "operator_reinstated";

  // WorkOS: deactivate or reactivate all org memberships
  if (tenant.workosOrganisationId) {
    try {
      const memberships = await workos.userManagement.listOrganizationMemberships({
        organizationId: tenant.workosOrganisationId,
        limit: 100,
      });
      await Promise.all(
        memberships.data.map((m) =>
          status === "suspended"
            ? workos.userManagement.deactivateOrganizationMembership(m.id)
            : workos.userManagement.reactivateOrganizationMembership(m.id)
        )
      );
    } catch {
      // Log but don't fail — DB state is authoritative for our app
    }
  }

  const updated = await prisma.$transaction(async (tx) => {
    const t = await tx.tenant.update({
      where: { id },
      data: { status },
    });
    await tx.auditLog.create({
      data: {
        entityType: "tenant",
        entityId: id,
        action: actionLabel,
        actorId: user.id,
        metadata: { previousStatus: tenant.status, newStatus: status },
      },
    });
    return t;
  });

  return NextResponse.json(updated);
}
