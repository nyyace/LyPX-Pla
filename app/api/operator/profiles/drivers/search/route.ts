import { withAuth } from "@workos-inc/authkit-nextjs";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getOperatorTenant } from "@/lib/utils/operator";

export async function GET(req: Request) {
  const { user } = await withAuth({ ensureSignedIn: true });
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tenant = await getOperatorTenant(user.id);
  if (!tenant) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const licence = new URL(req.url).searchParams.get("licence")?.trim().toUpperCase();
  if (!licence) return NextResponse.json({ error: "licence param required" }, { status: 400 });

  const submission = await prisma.driverSubmission.findFirst({
    where: { vocationalLicenceNumber: { equals: licence, mode: "insensitive" } },
    include: {
      driver: {
        include: {
          memberships: { where: { tenantId: tenant.id }, select: { tier1Member: true } },
        },
      },
    },
  });

  if (!submission) {
    return NextResponse.json({ found: false });
  }

  const d = submission.driver;
  const membership = d.memberships[0] ?? null;

  return NextResponse.json({
    found: true,
    driver: {
      id: d.id,
      firstName: d.firstName,
      lastName: d.lastName,
      phoneNumber: d.phoneNumber,
      complianceStatus: d.complianceStatus,
      alreadyMember: membership !== null,
      tier1Member: membership?.tier1Member ?? false,
      vocationalLicenceNumber: submission.vocationalLicenceNumber,
      vocationalLicenceExpiry: submission.vocationalLicenceExpiryDate.toISOString(),
    },
  });
}
