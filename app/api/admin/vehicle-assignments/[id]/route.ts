import { NextResponse } from "next/server";
import { withAuth } from "@workos-inc/authkit-nextjs";
import { prisma } from "@/lib/prisma";
import { isAdminUser } from "@/lib/utils/admin";
import { evaluateAndSyncDriverCompliance, evaluateAndSyncVehicleCompliance } from "@/lib/compliance/state-machine";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user } = await withAuth({ ensureSignedIn: true });
  if (!user || !(await isAdminUser(user.id))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json() as {
    action: "verify" | "update_expiry" | "terminate" | "update_notes";
    contractExpiry?: string | null;
    notes?: string | null;
  };

  if (!body.action) {
    return NextResponse.json({ error: "action is required" }, { status: 400 });
  }

  const assignment = await prisma.vehicleOwnership.findUnique({ where: { id } });
  if (!assignment) return NextResponse.json({ error: "Assignment not found" }, { status: 404 });

  let updates: Record<string, unknown> = {};
  let auditAction = "";

  switch (body.action) {
    case "verify":
      updates = { verifiedBy: user.id, verifiedAt: new Date() };
      auditAction = "vehicle_assignment_verified";
      break;

    case "update_expiry":
      if (body.contractExpiry === undefined) {
        return NextResponse.json({ error: "contractExpiry is required" }, { status: 400 });
      }
      updates = { contractExpiry: body.contractExpiry ? new Date(body.contractExpiry) : null };
      auditAction = "vehicle_assignment_expiry_updated";
      break;

    case "terminate":
      updates = {
        terminatedAt: new Date(),
        terminatedBy: user.id,
        contractStatus: "terminated",
      };
      auditAction = "vehicle_assignment_terminated";
      break;

    case "update_notes":
      updates = { notes: body.notes?.trim() || null };
      auditAction = "vehicle_assignment_notes_updated";
      break;

    default:
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  const updated = await prisma.vehicleOwnership.update({ where: { id }, data: updates });

  await prisma.auditLog.create({
    data: {
      entityType: "driver",
      entityId: assignment.driverId,
      action: auditAction,
      actorId: user.id,
      metadata: { vehicleId: assignment.vehicleId, assignmentId: id, ...updates },
    },
  });

  await Promise.all([
    evaluateAndSyncDriverCompliance(assignment.driverId, user.id),
    evaluateAndSyncVehicleCompliance(assignment.vehicleId, user.id),
  ]);

  return NextResponse.json(updated);
}
