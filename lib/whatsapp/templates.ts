// Approved template registry — safe to import in client components (no Node.js deps).
// hello_world is Meta's built-in test template (always available).
// Replace with approved custom templates once Meta approves them.
export const WHATSAPP_TEMPLATES = {
  hello_world: {
    name: "hello_world",
    language: "en_US",
    description: "Meta built-in test template",
  },
  trip_confirmation: {
    name: "trip_confirmation",
    language: "en",
    description: "Confirm trip booking with rider",
  },
  driver_briefing: {
    name: "driver_briefing",
    language: "en",
    description: "Brief driver on upcoming trip",
  },
  compliance_expiry_reminder: {
    name: "compliance_expiry_reminder",
    language: "en",
    description: "Remind driver of upcoming document expiry",
  },
} as const;

export type TemplateKey = keyof typeof WHATSAPP_TEMPLATES;
