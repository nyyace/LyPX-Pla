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

  const vehicles = await prisma.vehicle.findMany({
    where: { deletedAt: null },
    orderBy: { plateNumber: "asc" },
    select: {
      plateNumber: true,
      make: true,
      model: true,
      year: true,
      colour: true,
      vehicleClass: true,
      status: true,
      seatingCapacity: true,
      insuranceCompany: true,
    },
  });

  const rows = vehicles.map((v) => ({
    plateNumber: v.plateNumber,
    make: v.make,
    model: v.model,
    year: v.year ?? "",
    colour: v.colour ?? "",
    vehicleClass: v.vehicleClass ?? "",
    status: v.status,
    seatingCapacity: v.seatingCapacity ?? "",
    insuranceCompany: v.insuranceCompany ?? "",
  }));

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Vehicles");

  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

  return new Response(buf, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="vehicles-${new Date().toISOString().slice(0, 10)}.xlsx"`,
    },
  });
}
