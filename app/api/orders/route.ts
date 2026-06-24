import { NextResponse } from "next/server";
import { prisma, type TxClient } from "@/lib/prisma";
import { onTripCompleted } from "@/lib/claims/engine";
import { getMarketplaceConfig, calculateMarketplaceFee } from "@/lib/utils/marketplace";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const accountId = searchParams.get("accountId");

  const orders = await prisma.order.findMany({
    where: {
      ...(status ? { status } : {}),
      ...(accountId ? { accountId } : {}),
    },
    orderBy: { pickupTime: "desc" },
    include: {
      account: { select: { name: true } },
      driver: { select: { firstName: true, lastName: true } },
      vehicle: { select: { plateNumber: true } },
    },
  });

  return NextResponse.json(orders);
}

export async function POST(req: Request) {
  const body = await req.json();
  const { accountId, tenantId, pickupTime, pickupLocation, dropoffLocation, driverId, vehicleId, notes, tripFare } = body;

  if (!accountId || !tenantId || !pickupTime || !pickupLocation || !dropoffLocation) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // Calculate marketplace fee for LyPX Direct trips with a known fare
  let feeData: {
    tripFare: number;
    lypxFee: number;
    operatorReceives: number;
    rateApplied: string;
    takeRateSnapshot: number;
    floorRateSnapshot: number;
  } | null = null;

  if (tenantId === "lypx_direct" && tripFare != null) {
    const fare = parseFloat(tripFare);
    if (!isNaN(fare) && fare > 0) {
      const config = await getMarketplaceConfig(prisma);
      const { lypxFee, operatorReceives, rateApplied } = calculateMarketplaceFee(
        fare,
        config.takeRatePercent,
        config.floorRateSGD
      );
      feeData = {
        tripFare: fare,
        lypxFee,
        operatorReceives,
        rateApplied,
        takeRateSnapshot: config.takeRatePercent,
        floorRateSnapshot: config.floorRateSGD,
      };
    }
  }

  const order = await prisma.$transaction(async (tx: TxClient) => {
    const o = await tx.order.create({
      data: {
        accountId,
        tenantId,
        driverId: driverId ?? null,
        vehicleId: vehicleId ?? null,
        pickupTime: new Date(pickupTime),
        pickupLocation,
        dropoffLocation,
        notes: notes ?? null,
        status: "booked",
        ...(feeData ?? {}),
      },
    });

    await tx.auditLog.create({
      data: {
        entityType: "order",
        entityId: o.id,
        action: "order_created",
        actorId: "admin",
        metadata: {
          accountId,
          tenantId,
          pickupTime,
          pickupLocation,
          dropoffLocation,
          ...(feeData ? { lypxFee: feeData.lypxFee, takeRateSnapshot: feeData.takeRateSnapshot } : {}),
        },
      },
    });

    return o;
  });

  return NextResponse.json(order, { status: 201 });
}
