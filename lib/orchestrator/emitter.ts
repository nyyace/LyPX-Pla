import type { PrismaClient } from "../generated/prisma";

export async function emitEvent(
  eventType: string,
  payload: Record<string, unknown>,
  prisma: PrismaClient
): Promise<void> {
  await prisma.eventQueue.create({
    data: { eventType, payload: payload as object, status: "pending" },
  });
}
