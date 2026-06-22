import { prisma } from "@/lib/prisma";
import { DEFAULT_ACCENT } from "./theme";

export async function getOperatorTenant(userId: string) {
  const mapping = await prisma.tenantUser.findFirst({
    where: { userId },
    include: {
      tenant: {
        include: { preference: true },
      },
    },
  });
  return mapping?.tenant ?? null;
}

export async function getOperatorAccent(tenantId: string): Promise<string> {
  const pref = await prisma.tenantPreference.findUnique({ where: { tenantId } });
  return pref?.accentColour ?? DEFAULT_ACCENT;
}
