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

  await prisma.platformConfig.createMany({
    skipDuplicates: true,
    data: [
      {
        key: "marketplace_take_rate_percent",
        value: "12",
        description: "LyPX marketplace take rate applied to all LyPX Direct trips (percentage)",
      },
      {
        key: "marketplace_floor_rate_sgd",
        value: "3",
        description: "Minimum LyPX fee per LyPX Direct trip regardless of percentage (SGD)",
      },
    ],
  });
  console.log("Seeded: PlatformConfig (marketplace_take_rate_percent=12, marketplace_floor_rate_sgd=3)");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
