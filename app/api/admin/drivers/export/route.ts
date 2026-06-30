import { NextResponse } from "next/server";
import { withAuth } from "@workos-inc/authkit-nextjs";
import { prisma } from "@/lib/prisma";
import { isAdminUser } from "@/lib/utils/admin";
import * as XLSX from "xlsx";

export async function GET() {
  const { user } = await withAuth({ ensureSignedIn: true });
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = await isAdminUser(user.id);
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const drivers = await prisma.driver.findMany({
    where: { deletedAt: null },
    orderBy: { lastName: "asc" },
    include: {
      memberships: { select: { relationshipType: true }, take: 1 },
    },
  });

  const rows = drivers.map((d) => ({
    firstName: d.firstName,
    lastName: d.lastName,
    phoneNumber: d.phoneNumber,
    licenseNumber: d.licenseNumber ?? "",
    licenseIssuedDate: d.licenseIssuedDate
      ? d.licenseIssuedDate.toISOString().slice(0, 10)
      : "",
    complianceStatus: d.complianceStatus,
    tier2Qualified: d.tier2Qualified ? "yes" : "no",
    sourceType: d.sourceType,
    // nationalId cannot be recovered from identityHash
    nationalId: "",
    // relationshipType lives on OperatorDriverMembership, blank for admin export
    relationshipType: d.memberships[0]?.relationshipType ?? "",
  }));

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Drivers");

  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

  return new Response(buf, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="drivers-${new Date().toISOString().slice(0, 10)}.xlsx"`,
    },
  });
}
