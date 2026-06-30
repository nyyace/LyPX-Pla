import { withAuth } from "@workos-inc/authkit-nextjs";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getPartnerAccount } from "@/lib/utils/partner";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user } = await withAuth({ ensureSignedIn: true });
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const account = await getPartnerAccount(user.id);
  if (!account) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;

  const order = await prisma.order.findFirst({
    where: { id, accountId: account.id },
    select: {
      id: true, status: true, jobReference: true,
      serviceType: true, pickupTime: true,
      pickupLocation: true, dropoffLocation: true,
      flightNumber: true, nameBoardText: true, disposalHours: true,
      passengerName: true, passengerWhatsapp: true,
      notes: true, fareAmount: true, fareCurrency: true,
      completedAt: true, createdAt: true,
      driver: { select: { firstName: true, lastName: true, phoneNumber: true } },
      vehicle: { select: { plateNumber: true, make: true, model: true } },
    },
  });

  if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(order);
}
