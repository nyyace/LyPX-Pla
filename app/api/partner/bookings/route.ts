import { withAuth } from "@workos-inc/authkit-nextjs";
import { prisma, type TxClient } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getPartnerAccount } from "@/lib/utils/partner";
import { normalizePhone } from "@/lib/utils/normalizePhone";

export async function GET() {
  const { user } = await withAuth({ ensureSignedIn: true });
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const account = await getPartnerAccount(user.id);
  if (!account) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const orders = await prisma.order.findMany({
    where: { accountId: account.id },
    orderBy: { pickupTime: "desc" },
    take: 100,
    select: {
      id: true, status: true, jobReference: true,
      pickupTime: true, pickupLocation: true, dropoffLocation: true,
      serviceType: true, passengerName: true, passengerWhatsapp: true,
      fareAmount: true, fareCurrency: true,
      driver: { select: { firstName: true, lastName: true } },
    },
  });

  return NextResponse.json(orders);
}

export async function POST(req: Request) {
  const { user } = await withAuth({ ensureSignedIn: true });
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const account = await getPartnerAccount(user.id);
  if (!account) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const {
    serviceType,
    pickupTime,
    pickupLocation,
    dropoffLocation,
    flightNumber,
    nameBoardText,
    disposalHours,
    passengerName,
    passengerWhatsapp,
    notes,
  } = body;

  if (!pickupTime || !pickupLocation?.trim()) {
    return NextResponse.json({ error: "Pickup time and location are required" }, { status: 400 });
  }

  const normalisedPassengerWa = passengerWhatsapp
    ? (normalizePhone(passengerWhatsapp) ?? passengerWhatsapp.trim())
    : null;

  const order = await prisma.$transaction(async (tx: TxClient) => {
    const year  = new Date().getFullYear().toString().slice(-2);
    const count = await tx.order.count();
    const jobReference = `LYP-${year}${String(count + 1).padStart(5, "0")}`;

    const o = await tx.order.create({
      data: {
        accountId:         account.id,
        tenantId:          "lypx_direct",
        status:            "booked",
        serviceType:       serviceType ?? "p2p",
        pickupTime:        new Date(pickupTime),
        pickupLocation:    pickupLocation.trim(),
        dropoffLocation:   dropoffLocation?.trim() ?? null,
        flightNumber:      flightNumber ?? null,
        nameBoardText:     nameBoardText ?? null,
        disposalHours:     disposalHours ?? null,
        passengerName:     passengerName ?? null,
        passengerWhatsapp: normalisedPassengerWa,
        sameAsRequestor:   false,
        notes:             notes ?? null,
        timezone:          "Asia/Singapore",
        jobReference,
      },
    });

    await tx.auditLog.create({
      data: {
        entityType: "order",
        entityId:   o.id,
        action:     "order_created_by_partner",
        actorId:    user.id,
        metadata:   { accountId: account.id, pickupTime, pickupLocation, serviceType },
      },
    });

    return o;
  });

  return NextResponse.json(order, { status: 201 });
}
