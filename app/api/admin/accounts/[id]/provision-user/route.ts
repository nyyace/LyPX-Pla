import { withAuth } from "@workos-inc/authkit-nextjs";
import { prisma } from "@/lib/prisma";
import { workos } from "@/lib/workos/auth";
import { NextResponse } from "next/server";
import { isAdminUser } from "@/lib/utils/admin";

// POST /api/admin/accounts/[id]/provision-user
// Creates a new WorkOS user and links them to this account in one step.
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user } = await withAuth({ ensureSignedIn: true });
  if (!user || !(await isAdminUser(user.id))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id: accountId } = await params;

  const account = await prisma.account.findUnique({ where: { id: accountId } });
  if (!account) return NextResponse.json({ error: "Account not found" }, { status: 404 });

  const { email, firstName, lastName, password, role = "member" } = await req.json() as {
    email: string;
    firstName?: string;
    lastName?: string;
    password: string;
    role?: string;
  };

  if (!email?.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Valid email is required" }, { status: 400 });
  }
  if (!password || password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
  }

  let workosUser;
  try {
    workosUser = await workos.userManagement.createUser({
      email: email.trim(),
      password,
      firstName: firstName?.trim() || undefined,
      lastName:  lastName?.trim()  || undefined,
      emailVerified: true,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "WorkOS error";
    return NextResponse.json({ error: `WorkOS: ${message}` }, { status: 502 });
  }

  const accountUser = await prisma.accountUser.upsert({
    where: { userId_accountId: { userId: workosUser.id, accountId } },
    create: { userId: workosUser.id, accountId, role },
    update: { role },
  });

  await prisma.auditLog.create({
    data: {
      entityType: "account",
      entityId:   accountId,
      action:     "partner_user_provisioned",
      actorId:    user.id,
      metadata:   { workosUserId: workosUser.id, email: workosUser.email, role },
    },
  });

  return NextResponse.json({
    workosUserId: workosUser.id,
    email:        workosUser.email,
    accountUser,
  }, { status: 201 });
}
