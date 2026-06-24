import { withAuth } from "@workos-inc/authkit-nextjs";
import { prisma } from "@/lib/prisma";
import { workos } from "@/lib/workos/auth";
import { NextResponse } from "next/server";
import { isAdminUser } from "@/lib/utils/admin";

const ADMIN_ORG_ID = process.env.WORKOS_ADMIN_ORG_ID;
const SUPER_ADMIN_EMAIL = process.env.WORKOS_SUPER_ADMIN_EMAIL;

// GET /api/admin/users — list all LyPX admin users
export async function GET() {
  const { user } = await withAuth({ ensureSignedIn: true });
  if (!user || !(await isAdminUser(user.id))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!ADMIN_ORG_ID) {
    return NextResponse.json({ users: [], unconfigured: true });
  }

  try {
    const memberships = await workos.userManagement.listOrganizationMemberships({
      organizationId: ADMIN_ORG_ID,
      limit: 100,
    });

    const users = await Promise.all(
      memberships.data.map(async (m) => {
        try {
          const u = await workos.userManagement.getUser(m.userId);
          return {
            id: u.id,
            email: u.email,
            firstName: u.firstName,
            lastName: u.lastName,
            emailVerified: u.emailVerified,
            createdAt: u.createdAt,
            membershipStatus: m.status,
            role: u.email === SUPER_ADMIN_EMAIL ? "super_admin" : "admin",
          };
        } catch {
          return null;
        }
      })
    );

    return NextResponse.json({ users: users.filter(Boolean) });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "WorkOS error";
    return NextResponse.json({ error: `WorkOS: ${message}` }, { status: 502 });
  }
}

// POST /api/admin/users — invite a new LyPX admin user
export async function POST(req: Request) {
  const { user } = await withAuth({ ensureSignedIn: true });
  if (!user || !(await isAdminUser(user.id))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!ADMIN_ORG_ID) {
    return NextResponse.json({ error: "WORKOS_ADMIN_ORG_ID is not configured" }, { status: 500 });
  }

  const { email, name } = await req.json() as { email: string; name?: string };

  if (!email?.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Valid email is required" }, { status: 400 });
  }

  try {
    await workos.userManagement.sendInvitation({
      email: email.trim(),
      organizationId: ADMIN_ORG_ID,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "WorkOS error";
    return NextResponse.json({ error: `WorkOS: ${message}` }, { status: 502 });
  }

  await prisma.auditLog.create({
    data: {
      entityType: "admin_user",
      entityId: user.id,
      action: "admin_invited",
      actorId: user.id,
      metadata: { email: email.trim(), name: name ?? null },
    },
  });

  return NextResponse.json({ ok: true }, { status: 201 });
}
