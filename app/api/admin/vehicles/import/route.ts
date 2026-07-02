import { NextResponse } from "next/server";
import { withAuth } from "@workos-inc/authkit-nextjs";
import { prisma, type TxClient } from "@/lib/prisma";
import { isAdminUser } from "@/lib/utils/admin";
import { VEHICLE_CLASSES } from "@/lib/constants/vehicleClasses";
import { reactivateVehicle } from "@/lib/entities/reactivation";
import * as XLSX from "xlsx";

const VALID_CLASSES = new Set<string>(VEHICLE_CLASSES.map((c) => c.value));

export async function POST(req: Request) {
  const { user } = await withAuth({ ensureSignedIn: true });
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = await isAdminUser(user.id);
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // Must have a registered tenant to attribute new vehicles to
  const adminTenant = await prisma.tenant.findFirst({ where: { name: "LyPX" } });
  if (!adminTenant) return NextResponse.json({ error: "No admin tenant found" }, { status: 500 });

  const form = await req.formData();
  const file = form.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

  const buf = Buffer.from(await file.arrayBuffer());
  const wb = XLSX.read(buf, { type: "buffer" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string, string>>(ws);

  const results: { row: number; action: "created" | "updated" | "reactivated" | "skipped"; plate: string; reason?: string }[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2;

    const plateNumber = row["plateNumber"]?.toString().trim().toUpperCase();
    const make = row["make"]?.toString().trim();
    const model = row["model"]?.toString().trim();
    const plate = plateNumber || `Row ${rowNum}`;

    if (!plateNumber || !make || !model) {
      results.push({ row: rowNum, action: "skipped", plate, reason: "Missing required fields (plateNumber, make, model)" });
      continue;
    }

    const vehicleClass = row["vehicleClass"]?.toString().trim() || null;
    if (vehicleClass && !VALID_CLASSES.has(vehicleClass)) {
      results.push({ row: rowNum, action: "skipped", plate, reason: `Invalid vehicleClass: ${vehicleClass}` });
      continue;
    }

    const yearRaw = row["year"]?.toString().trim();
    const year = yearRaw ? parseInt(yearRaw, 10) : null;
    const seatingRaw = row["seatingCapacity"]?.toString().trim();
    const seatingCapacity = seatingRaw ? parseInt(seatingRaw, 10) : null;
    const colour = row["colour"]?.toString().trim() || null;
    const insuranceCompany = row["insuranceCompany"]?.toString().trim() || null;

    try {
      const existing = await prisma.vehicle.findFirst({ where: { plateNumber } });

      if (existing && existing.deletedAt) {
        await prisma.$transaction((tx: TxClient) =>
          reactivateVehicle(tx, existing.id, user.id, {
            make, model,
            year: year ?? null,
            colour: colour ?? null,
            vehicleClass: vehicleClass ?? null,
            seatingCapacity: seatingCapacity ?? null,
            insuranceCompany: insuranceCompany ?? null,
          })
        );
        results.push({ row: rowNum, action: "reactivated", plate });
      } else if (existing) {
        await prisma.vehicle.update({
          where: { id: existing.id },
          data: {
            make,
            model,
            year: year ?? undefined,
            colour: colour ?? undefined,
            vehicleClass: vehicleClass ?? undefined,
            seatingCapacity: seatingCapacity ?? undefined,
            insuranceCompany: insuranceCompany ?? undefined,
          },
        });
        results.push({ row: rowNum, action: "updated", plate });
      } else {
        await prisma.vehicle.create({
          data: {
            plateNumber,
            make,
            model,
            year: year ?? undefined,
            colour: colour ?? undefined,
            vehicleClass: vehicleClass ?? undefined,
            seatingCapacity: seatingCapacity ?? undefined,
            insuranceCompany: insuranceCompany ?? undefined,
            status: "inactive",
            registeredByTenantId: adminTenant.id,
          },
        });
        results.push({ row: rowNum, action: "created", plate });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      results.push({ row: rowNum, action: "skipped", plate, reason: msg });
    }
  }

  const created = results.filter((r) => r.action === "created").length;
  const updated = results.filter((r) => r.action === "updated").length;
  const skipped = results.filter((r) => r.action === "skipped").length;

  return NextResponse.json({ created, updated, skipped, results });
}
