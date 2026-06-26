import { NextResponse } from "next/server";
import { withAuth } from "@workos-inc/authkit-nextjs";
import { prisma, type TxClient } from "@/lib/prisma";
import { onTripCompleted } from "@/lib/claims/engine";
import { getMarketplaceConfig, calculateMarketplaceFee } from "@/lib/utils/marketplace";
import { emitEvent } from "@/lib/orchestrator/emitter";

const VALID_TRANSITIONS: Record<string, string[]> = {
  booked: ["assigned", "cancelled"],
  assigned: ["en_route", "cancelled"],
  en_route: ["arrived", "cancelled"],
  arrived: ["started", "cancelled"],
  started: ["completed"],
  completed: [],
  cancelled: [],
};

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      account: true,
      driver: true,
      vehicle: true,
    },
  });

  if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(order);
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user } = await withAuth({ ensureSignedIn: true });
  const { id } = await params;
  const body = await req.json();

  const order = await prisma.order.findUnique({ where: { id } });
  if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updates: Record<string, unknown> = {};

  if (body.status) {
    const allowed = VALID_TRANSITIONS[order.status];
    if (!allowed.includes(body.status)) {
      return NextResponse.json(
        { error: `Cannot transition from ${order.status} to ${body.status}` },
        { status: 400 }
      );
    }
    updates.status = body.status;

    if (body.status === "completed") {
      updates.completedAt = new Date();
      // Capture or update fare at completion if provided
      if (body.fareAmount != null) {
        const fare = parseFloat(body.fareAmount);
        updates.fareAmount = fare;
        updates.fareCurrency = body.fareCurrency ?? order.fareCurrency ?? "SGD";
        updates.fareNote = body.fareNote ?? order.fareNote ?? null;

        // Recalculate marketplace fee for lypx_direct on completion
        if (order.tenantId === "lypx_direct" && !isNaN(fare) && fare > 0) {
          const config = await getMarketplaceConfig(prisma);
          const { lypxFee, operatorReceives, rateApplied } = calculateMarketplaceFee(
            fare,
            config.takeRatePercent,
            config.floorRateSGD
          );
          updates.tripFare = fare;
          updates.lypxFee = lypxFee;
          updates.operatorReceives = operatorReceives;
          updates.rateApplied = rateApplied;
          updates.takeRateSnapshot = config.takeRatePercent;
          updates.floorRateSnapshot = config.floorRateSGD;
        }
      }
    }

    if (body.status === "cancelled") {
      updates.cancelledAt = new Date();
      updates.cancelledBy = user.id;
      updates.cancellationReason = body.cancellationReason ?? null;
    }
  }

  if (body.driverId !== undefined) updates.driverId = body.driverId;
  if (body.vehicleId !== undefined) updates.vehicleId = body.vehicleId;
  if (body.notes !== undefined) updates.notes = body.notes;
  if (body.fareAmount != null && !updates.fareAmount) {
    updates.fareAmount = parseFloat(body.fareAmount);
    updates.fareCurrency = body.fareCurrency ?? "SGD";
    updates.fareNote = body.fareNote ?? null;
  }

  const updated = await prisma.$transaction(async (tx: TxClient) => {
    const o = await tx.order.update({ where: { id }, data: updates });
    await tx.auditLog.create({
      data: {
        entityType: "order",
        entityId: id,
        action: body.status ? `order_${body.status}` : "order_updated",
        actorId: user.id,
        metadata: updates as object,
      },
    });
    return o;
  });

  // Trigger claim engine on trip completion
  if (updates.status === "completed") {
    await onTripCompleted(id);
  }

  // Emit notification event when a driver is assigned
  if (updates.status === "assigned") {
    await emitEvent("order.assigned", { orderId: id }, prisma);
  }

  return NextResponse.json(updated);
}
