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
            { plateNumber: { contains: search, mode: "insensitive" as const } },
            { make:        { contains: search, mode: "insensitive" as const } },
            { model:       { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const vehicles = await prisma.vehicle.findMany({
    where,
    select: {
      id:           true,
      plateNumber:  true,
      make:         true,
      model:        true,
      vehicleClass: true,
      status:       true,
    },
    take: 20,
    orderBy: { plateNumber: "asc" },
  });

  return NextResponse.json(vehicles);
}
