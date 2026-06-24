import type { PrismaClient } from "@/lib/generated/prisma";

export function calculateMarketplaceFee(
  tripFareSGD: number,
  takeRatePercent: number,
  floorRateSGD: number
): {
  lypxFee: number;
  operatorReceives: number;
  rateApplied: "percentage" | "floor";
} {
  const percentageFee = (tripFareSGD * takeRatePercent) / 100;
  const lypxFee = Math.max(percentageFee, floorRateSGD);

  return {
    lypxFee: Math.round(lypxFee * 100) / 100,
    operatorReceives: Math.round((tripFareSGD - lypxFee) * 100) / 100,
    rateApplied: percentageFee >= floorRateSGD ? "percentage" : "floor",
  };
}

// Always reads live values from DB — never cache in memory so config changes
// take effect on the very next trip created without a server restart.
export async function getMarketplaceConfig(client: PrismaClient): Promise<{
  takeRatePercent: number;
  floorRateSGD: number;
}> {
  const configs = await client.platformConfig.findMany({
    where: {
      key: { in: ["marketplace_take_rate_percent", "marketplace_floor_rate_sgd"] },
    },
  });

  const get = (key: string, fallback: number) =>
    parseFloat(configs.find((c) => c.key === key)?.value ?? String(fallback));

  return {
    takeRatePercent: get("marketplace_take_rate_percent", 12),
    floorRateSGD: get("marketplace_floor_rate_sgd", 3),
  };
}
