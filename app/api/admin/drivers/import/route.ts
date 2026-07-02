import { NextResponse } from "next/server";
import { withAuth } from "@workos-inc/authkit-nextjs";
import { prisma, type TxClient } from "@/lib/prisma";
import { isAdminUser } from "@/lib/utils/admin";
import { createHash } from "crypto";
import { reactivateDriver } from "@/lib/entities/reactivation";
import * as XLSX from "xlsx";

function makeIdentityHash(licenseNumber: string, nationalId: string): string {
  const normalized = `${licenseNumber.trim().toUpperCase()}::${nationalId.trim().toUpperCase()}`;
  return createHash("sha256").update(normalized).digest("hex");
}

export async function POST(req: Request) {
  const { user } = await withAuth({ ensureSignedIn: true });
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = await isAdminUser(user.id);
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const form = await req.formData();
  const file = form.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

  const buf = Buffer.from(await file.arrayBuffer());
  const wb = XLSX.read(buf, { type: "buffer" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string, string>>(ws);

  const results: { row: number; action: "created" | "updated" | "reactivated" | "skipped"; name: string; reason?: string }[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2; // 1-indexed + header row

    const firstName = row["firstName"]?.toString().trim();
    const lastName = row["lastName"]?.toString().trim();
    const phoneNumber = row["phoneNumber"]?.toString().trim();
    const licenseNumber = row["licenseNumber"]?.toString().trim();
    const nationalId = row["nationalId"]?.toString().trim();
    const name = `${firstName ?? ""} ${lastName ?? ""}`.trim() || `Row ${rowNum}`;

    if (!firstName || !lastName || !phoneNumber || !licenseNumber || !nationalId) {
      results.push({ row: rowNum, action: "skipped", name, reason: "Missing required fields (firstName, lastName, phoneNumber, licenseNumber, nationalId)" });
      continue;
    }

    const identityHash = makeIdentityHash(licenseNumber, nationalId);

    const licenseIssuedRaw = row["licenseIssuedDate"]?.toString().trim();
    const licenseIssuedDate = licenseIssuedRaw ? new Date(licenseIssuedRaw) : null;
    const tier2Qualified = row["tier2Qualified"]?.toString().trim().toLowerCase() === "yes";
    const sourceType = row["sourceType"]?.toString().trim() || "operator_added";

    try {
      const existing = await prisma.driver.findFirst({ where: { identityHash } });

      if (existing && existing.deletedAt) {
        await prisma.$transaction((tx: TxClient) =>
          reactivateDriver(tx, existing.id, user.id, {
            firstName, lastName, phoneNumber, licenseNumber,
            licenseIssuedDate: licenseIssuedDate ?? null,
            tier2Qualified, sourceType,
          })
        );
        results.push({ row: rowNum, action: "reactivated", name });
      } else if (existing) {
        await prisma.driver.update({
          where: { id: existing.id },
          data: {
            firstName,
            lastName,
            phoneNumber,
            licenseNumber,
            licenseIssuedDate: licenseIssuedDate ?? undefined,
            tier2Qualified,
            sourceType,
            complianceStatus: "pending",
          },
        });
        results.push({ row: rowNum, action: "updated", name });
      } else {
        await prisma.driver.create({
          data: {
            identityHash,
            firstName,
            lastName,
            phoneNumber,
            licenseNumber,
            licenseIssuedDate: licenseIssuedDate ?? undefined,
            tier2Qualified,
            sourceType,
            complianceStatus: "pending",
          },
        });
        results.push({ row: rowNum, action: "created", name });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      results.push({ row: rowNum, action: "skipped", name, reason: msg });
    }
  }

  const created = results.filter((r) => r.action === "created").length;
  const updated = results.filter((r) => r.action === "updated").length;
  const skipped = results.filter((r) => r.action === "skipped").length;

  return NextResponse.json({ created, updated, skipped, results });
}
