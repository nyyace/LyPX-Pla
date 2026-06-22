import { withAuth } from "@workos-inc/authkit-nextjs";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  await withAuth({ ensureSignedIn: true });
  const { tenantId } = await params;
  const body = await req.json();

  const updates: Record<string, string> = {};
  if (body.accentColour) updates.accentColour = body.accentColour;
  if (body.timezone) updates.timezone = body.timezone;

  const pref = await prisma.tenantPreference.upsert({
    where: { tenantId },
    create: { tenantId, ...updates },
    update: updates,
  });

  await prisma.auditLog.create({
    data: {
      entityType: "tenant",
      entityId: tenantId,
      action: "preference_updated",
      metadata: updates,
    },
  });

  return Response.json(pref);
}
