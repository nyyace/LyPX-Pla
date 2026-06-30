import { NextResponse } from "next/server";
import { withAuth } from "@workos-inc/authkit-nextjs";
import { prisma, type TxClient } from "@/lib/prisma";
import { onTripCompleted } from "@/lib/claims/engine";
import { getMarketplaceConfig, calculateMarketplaceFee } from "@/lib/utils/marketplace";
import { emitEvent } from "@/lib/orchestrator/emitter";
import { checkJobCompliance } from "@/lib/compliance/checkJobCompliance";

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

  // Compliance gate: block assignment if driver/vehicle do not pass all checks
  const isAssigning = body.status === "assigned";
  const driverIdForCheck  = body.driverId  ?? order.driverId;
  const vehicleIdForCheck = body.vehicleId ?? order.vehicleId;

  if (isAssigning && driverIdForCheck && vehicleIdForCheck) {
    const jobTime = order.pickupTime;
    if (!jobTime) {
      return NextResponse.json(
        { error: "Order has no pickup time. Set the time before assigning a driver." },
        { status: 400 }
      );
    }

    const compliance = await checkJobCompliance(
      driverIdForCheck,
      vehicleIdForCheck,
      jobTime,
      prisma,
    );

    if (!compliance.passed) {
      return NextResponse.json(
        { error: "Compliance check failed", failures: compliance.failures },
        { status: 422 }
      );
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
  if (body.driverPayableAmount != null) {
    updates.driverPayableAmount = parseFloat(body.driverPayableAmount);
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

  // Only fire order.assigned when a driver is actually present (being set now or already set)
  const assignedDriverId = (updates.driverId as string | null | undefined) ?? order.driverId;
  if (updates.status === "assigned" && assignedDriverId) {
    await emitEvent("order.assigned", { orderId: id }, prisma);
  }
  if (updates.status === "en_route")  await emitEvent("order.en_route",   { orderId: id }, prisma);
  if (updates.status === "arrived")   await emitEvent("order.arrived",    { orderId: id }, prisma);
  if (updates.status === "completed") await emitEvent("order.completed",  { orderId: id }, prisma);

  return NextResponse.json(updated);
}
