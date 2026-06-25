import { withAuth } from "@workos-inc/authkit-nextjs";
import { prisma } from "@/lib/prisma";
import { getOperatorTenant } from "@/lib/utils/operator";
import { redirect } from "next/navigation";
import { VehiclesPanel } from "@/components/lypx/VehiclesPanel";

export default async function OperatorVehiclesPage() {
  const { user } = await withAuth({ ensureSignedIn: true });
  const tenant = await getOperatorTenant(user.id);
  if (!tenant) redirect("/operator/dispatch");

  const vehicles = await prisma.vehicle.findMany({
    where: { registeredByTenantId: tenant.id },
    include: {
      ownership: {
        where: { contractStatus: "active" },
        include: {
          driver: {
            select: { id: true, firstName: true, lastName: true, complianceStatus: true },
          },
        },
      },
      documents: {
        select: { id: true, docType: true, status: true, expiryDate: true, file: { select: { fileName: true } } },
        orderBy: { uploadedAt: "desc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const drivers = await prisma.operatorDriverMembership.findMany({
    where: { tenantId: tenant.id },
    include: {
      driver: {
        select: { id: true, firstName: true, lastName: true, complianceStatus: true },
      },
    },
  });

  return (
    <VehiclesPanel
      initialVehicles={vehicles as Parameters<typeof VehiclesPanel>[0]["initialVehicles"]}
      availableDrivers={drivers.map((m) => ({
        id: m.driver.id,
        firstName: m.driver.firstName,
        lastName: m.driver.lastName,
        complianceStatus: m.driver.complianceStatus,
      }))}
    />
  );
}
