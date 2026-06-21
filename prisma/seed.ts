import { PrismaClient } from "../lib/generated/prisma";

const prisma = new PrismaClient();

async function main() {
  await prisma.tenant.upsert({
    where: { id: "lypx_direct" },
    update: { name: "LyPX Direct" },
    create: {
      id: "lypx_direct",
      name: "LyPX Direct",
      tenantType: "lypx_direct",
      marketplaceParticipation: false,
    },
  });
  console.log("Seeded: LyPX Direct tenant (id=lypx_direct)");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
