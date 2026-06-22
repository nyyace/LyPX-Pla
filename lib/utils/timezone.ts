import { prisma } from "@/lib/prisma";
import { DEFAULT_TIMEZONE } from "./date";

// Server-only helper — call from async Server Components or Route Handlers only.
export async function getUserTimezone(userId: string): Promise<string> {
  const pref = await prisma.userPreference.findUnique({ where: { userId } });
  return pref?.timezone ?? DEFAULT_TIMEZONE;
}
