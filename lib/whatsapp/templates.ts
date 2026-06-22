// Approved template registry — safe to import in client components (no Node.js deps).
// hello_world is Meta's built-in test template (always available).
// Onboarding templates need Meta approval before they work in production.
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
  onboarding_submitted: {
    name: "onboarding_submitted",
    language: "en",
    description: "Notify driver their application is under review (needs Meta approval)",
  },
  onboarding_approved: {
    name: "onboarding_approved",
    language: "en",
    description: "Notify driver their profile is approved (needs Meta approval)",
  },
  onboarding_rejected: {
    name: "onboarding_rejected",
    language: "en",
    description: "Notify driver their application needs resubmission (needs Meta approval)",
  },
} as const;

export type TemplateKey = keyof typeof WHATSAPP_TEMPLATES;
