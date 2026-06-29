import { NextResponse } from "next/server";
import { withAuth } from "@workos-inc/authkit-nextjs";
import { prisma } from "@/lib/prisma";
import { isAdminUser } from "@/lib/utils/admin";

export async function GET(req: Request) {
  const { user } = await withAuth({ ensureSignedIn: true });
  if (!user || !(await isAdminUser(user.id))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search")?.trim();

  const where = {
    deletedAt: null,
    ...(search
      ? {
          OR: [
            { firstName:   { contains: search, mode: "insensitive" as const } },
            { lastName:    { contains: search, mode: "insensitive" as const } },
            { phoneNumber: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const drivers = await prisma.driver.findMany({
    where,
    select: {
      id:               true,
      firstName:        true,
      lastName:         true,
      phoneNumber:      true,
      complianceStatus: true,
    },
    take: 20,
    orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
  });

  return NextResponse.json(drivers);
}
