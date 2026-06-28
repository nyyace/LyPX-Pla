import { withAuth } from "@workos-inc/authkit-nextjs";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { isAdminUser } from "@/lib/utils/admin";

// POST /api/admin/accounts/[id]/users
// Links a WorkOS userId to an Account, granting partner console access.
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user } = await withAuth({ ensureSignedIn: true });
  if (!user || !(await isAdminUser(user.id))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id: accountId } = await params;
  const { userId, role = "member" } = await req.json() as { userId: string; role?: string };

  if (!userId?.trim()) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }

  const account = await prisma.account.findUnique({ where: { id: accountId } });
  if (!account) return NextResponse.json({ error: "Account not found" }, { status: 404 });

  const accountUser = await prisma.accountUser.upsert({
    where: { userId_accountId: { userId, accountId } },
    create: { userId, accountId, role },
    update: { role },
  });

  await prisma.auditLog.create({
    data: {
      entityType: "account",
      entityId:   accountId,
      action:     "partner_user_linked",
      actorId:    user.id,
      metadata:   { userId, role },
    },
  });

  return NextResponse.json(accountUser, { status: 201 });
}

// GET /api/admin/accounts/[id]/users
// Lists all users linked to this account.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user } = await withAuth({ ensureSignedIn: true });
  if (!user || !(await isAdminUser(user.id))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id: accountId } = await params;
  const users = await prisma.accountUser.findMany({
    where: { accountId },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(users);
}
