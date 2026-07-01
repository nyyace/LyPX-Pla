import { PrismaClient } from "@/lib/generated/prisma";
import { VEHICLE_CLASS_LABELS } from "@/lib/constants/vehicleClasses";

export interface ComplianceFailure {
  check: string;
  message: string;
}

export interface ComplianceResult {
  passed: boolean;
  failures: ComplianceFailure[];
}

export async function checkJobCompliance(
  driverId: string,
  vehicleId: string,
  scheduledAt: Date,
  prisma: PrismaClient,
  requestedTypes?: string[],
): Promise<ComplianceResult> {
  const failures: ComplianceFailure[] = [];

  const [driver, vehicle, bond, vocLicence, insurance] = await Promise.all([
    prisma.driver.findUnique({
      where: { id: driverId },
      select: { licenseIssuedDate: true, complianceStatus: true },
    }),
    prisma.vehicle.findUnique({
      where: { id: vehicleId },
      select: { status: true, vehicleClass: true },
    }),
    prisma.vehicleOwnership.findFirst({
      where: { driverId, vehicleId, terminatedAt: null },
      orderBy: { createdAt: "desc" },
    }),
    prisma.complianceDocument.findFirst({
      where: { driverId, docType: "vocational_licence", status: "verified" },
      orderBy: { expiryDate: "desc" },
    }),
    prisma.complianceDocument.findFirst({
      where: { vehicleId, docType: "insurance", status: "verified" },
      orderBy: { expiryDate: "desc" },
    }),
  ]);

  if (!driver) {
    return { passed: false, failures: [{ check: "driver", message: "Driver record not found." }] };
  }
  if (!vehicle) {
    return { passed: false, failures: [{ check: "vehicle", message: "Vehicle record not found." }] };
  }

  // CHECK 1 — Driving experience (2 years minimum)
  if (!driver.licenseIssuedDate) {
    failures.push({
      check: "experience",
      message: "Driving licence issued date not recorded. Update the driver profile before assigning.",
    });
  } else {
    const minDate = new Date(scheduledAt);
    minDate.setFullYear(minDate.getFullYear() - 2);
    if (driver.licenseIssuedDate > minDate) {
      const ms = scheduledAt.getTime() - driver.licenseIssuedDate.getTime();
      const years = (ms / (365.25 * 24 * 60 * 60 * 1000)).toFixed(1);
      failures.push({
        check: "experience",
        message: `Driver has ${years} year(s) driving experience. Minimum 2 years required for this job date.`,
      });
    }
  }

  // CHECK 2 — Vocational licence
  if (!vocLicence) {
    failures.push({
      check: "vocational_licence",
      message: "No verified vocational licence (PDVL/TDVL) on file.",
    });
  } else if (!vocLicence.expiryDate || vocLicence.expiryDate < scheduledAt) {
    failures.push({
      check: "vocational_licence",
      message: vocLicence.expiryDate
        ? `Vocational licence expired ${vocLicence.expiryDate.toLocaleDateString("en-SG")}. Job date: ${scheduledAt.toLocaleDateString("en-SG")}.`
        : "Vocational licence has no expiry date recorded.",
    });
  }

  // CHECK 3 — Driver compliance status
  if (driver.complianceStatus === "suspended") {
    failures.push({
      check: "driver_status",
      message: "Driver is currently suspended. Resolve compliance issues first.",
    });
  } else if (driver.complianceStatus === "pending") {
    failures.push({
      check: "driver_status",
      message: "Driver compliance review is pending. All documents must be verified before assignment.",
    });
  }

  // CHECK 4 — Vehicle insurance
  if (!insurance) {
    failures.push({
      check: "insurance",
      message: "No verified insurance certificate on file for this vehicle.",
    });
  } else if (!insurance.expiryDate || insurance.expiryDate < scheduledAt) {
    failures.push({
      check: "insurance",
      message: insurance.expiryDate
        ? `Vehicle insurance expired ${insurance.expiryDate.toLocaleDateString("en-SG")}. Job date: ${scheduledAt.toLocaleDateString("en-SG")}.`
        : "Vehicle insurance has no expiry date recorded.",
    });
  }

  // CHECK 5 — Vehicle status
  if (vehicle.status !== "active") {
    failures.push({
      check: "vehicle_status",
      message: `Vehicle status is '${vehicle.status}'. Only active vehicles can be assigned to jobs.`,
    });
  }

  // CHECK 6 — Vehicle class match
  if (requestedTypes && requestedTypes.length > 0) {
    if (!vehicle.vehicleClass) {
      failures.push({
        check: "vehicle_class",
        message: "Vehicle has no class assigned. Set the vehicle class in the vehicle profile before assigning to this job.",
      });
    } else if (!requestedTypes.includes(vehicle.vehicleClass)) {
      const requestedLabels = requestedTypes.map((t) => VEHICLE_CLASS_LABELS[t] ?? t).join(", ");
      failures.push({
        check: "vehicle_class",
        message: `This job requested: ${requestedLabels}. The assigned vehicle is classified as ${VEHICLE_CLASS_LABELS[vehicle.vehicleClass] ?? vehicle.vehicleClass}. Please assign a vehicle of the correct class.`,
      });
    }
  }

  // CHECK 7 — Driver-vehicle bond
  if (!bond) {
    failures.push({
      check: "bond",
      message: "No active assignment between this driver and vehicle. Create an ownership or rental record first.",
    });
  } else if (bond.relationshipType === "owned") {
    if (!bond.verifiedAt) {
      failures.push({
        check: "bond",
        message: "Vehicle ownership has not been verified by admin. Please verify the ownership record.",
      });
    }
  } else if (bond.relationshipType === "contracted") {
    if (bond.contractStatus !== "active") {
      failures.push({
        check: "bond",
        message: `Rental agreement status is '${bond.contractStatus}'. Only active agreements are valid.`,
      });
    } else if (!bond.contractExpiry) {
      failures.push({
        check: "bond",
        message: "Rental agreement has no expiry date. Update the rental record.",
      });
    } else if (bond.contractExpiry < scheduledAt) {
      failures.push({
        check: "bond",
        message: `Rental agreement expired ${bond.contractExpiry.toLocaleDateString("en-SG")}. Job date: ${scheduledAt.toLocaleDateString("en-SG")}.`,
      });
    }
  }

  return { passed: failures.length === 0, failures };
}
