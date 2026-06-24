import { withAuth } from "@workos-inc/authkit-nextjs";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { isValidUEN, formatUEN } from "@/lib/utils/uen";
import { getOperatorTenant } from "@/lib/utils/operator";

export async function GET(req: Request) {
  const { user } = await withAuth({ ensureSignedIn: true });
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tenant = await getOperatorTenant(user.id);
  if (!tenant) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const uen = new URL(req.url).searchParams.get("uen") ?? "";
  if (!isValidUEN(uen)) {
    return NextResponse.json({ error: "Invalid UEN format" }, { status: 400 });
  }

  const account = await prisma.account.findUnique({
    where: { uen: formatUEN(uen) },
    include: {
      claims: {
        where: { status: { in: ["claimed", "won"] } },
        take: 1,
      },
    },
  });

  if (!account) {
    return NextResponse.json({ status: "clear", message: "Company not registered. You may proceed." });
  }

  const activeClaim = account.claims[0];
  if (!activeClaim) {
    return NextResponse.json({ status: "clear", message: "Company found. You may proceed to onboard." });
  }

  return NextResponse.json({
    status: "conflict",
    message: "This company is already registered on the platform. Your request will be reviewed by LyPX.",
  });
}
