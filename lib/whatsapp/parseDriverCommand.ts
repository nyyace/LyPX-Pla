export type CommandWord = "OTW" | "OTS" | "POB" | "JC" | "DONE";

export type DriverCommand = {
  command: CommandWord;
  jobReference: string;
} | null;

const VALID_COMMANDS: CommandWord[] = ["OTW", "OTS", "POB", "JC", "DONE"];

/**
 * Parse an inbound WhatsApp message body from a driver into a structured command.
 *
 * Accepted formats (case-insensitive):
 *   OTW LYP-2600001   → on the way
 *   OTS LYP-2600001   → on the scene / arrived
 *   POB LYP-2600001   → passenger on board
 *   JC  LYP-2600001   → job complete
 *   DONE LYP-2600001  → alias for JC (backwards compatibility)
 *
 * Returns null if not a recognised driver command.
 */
export function parseDriverCommand(body: string | null | undefined): DriverCommand {
  if (!body) return null;
  const parts = body.trim().toUpperCase().split(/\s+/);
  if (parts.length < 2) return null;

  const [cmd, ref] = parts;

  if (!VALID_COMMANDS.includes(cmd as CommandWord)) return null;
  if (!ref || ref.length < 3) return null;

  return { command: cmd as CommandWord, jobReference: ref };
}

export function commandToStatus(command: CommandWord): string {
  const map: Record<CommandWord, string> = {
    OTW:  "en_route",
    OTS:  "arrived",
    POB:  "started",
    JC:   "completed",
    DONE: "completed",
  };
  return map[command];
}

export function commandToEvent(command: CommandWord): string {
  const map: Record<CommandWord, string> = {
    OTW:  "order.en_route",
    OTS:  "order.arrived",
    POB:  "order.started",
    JC:   "order.completed",
    DONE: "order.completed",
  };
  return map[command];
}

export function commandToReply(command: CommandWord, jobReference: string): string {
  const map: Record<CommandWord, string> = {
    OTW:  `Got it — you are on the way for ${jobReference}. Safe driving.`,
    OTS:  `Confirmed — you have arrived at the pickup for ${jobReference}.`,
    POB:  `Passenger on board confirmed for ${jobReference}. Have a smooth trip.`,
    JC:   `Job ${jobReference} marked as complete. Thank you.`,
    DONE: `Job ${jobReference} marked as complete. Thank you.`,
  };
  return map[command];
}
