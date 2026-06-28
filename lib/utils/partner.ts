import { prisma } from "@/lib/prisma";

export async function getPartnerAccount(userId: string) {
  const mapping = await prisma.accountUser.findFirst({
    where: { userId },
    include: { account: true },
  });
  return mapping?.account ?? null;
}

export async function provisionPartnerUser(userId: string, accountId: string): Promise<boolean> {
  const account = await prisma.account.findUnique({ where: { id: accountId } });
  if (!account) return false;

  await prisma.accountUser.upsert({
    where: { userId_accountId: { userId, accountId } },
    create: { userId, accountId, role: "member" },
    update: {},
  });

  return true;
}
