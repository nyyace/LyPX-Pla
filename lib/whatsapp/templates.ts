// Approved template registry — safe to import in client components (no Node.js deps).
export const WHATSAPP_TEMPLATES = {
  hello_world: {
    name: "hello_world",
    language: "en_US",
    description: "Meta built-in test template",
  },
  // ── Onboarding ────────────────────────────────────────────────────────
  driver_otp: {
    name: "driver_otp",
    language: "en",
    description: "OTP verification code for driver self-onboarding",
  },
  driver_invite: {
    name: "driver_onboard_invite",
    language: "en",
    description: "Invite driver to self-onboard via operator referral",
  },
  onboarding_submitted: {
    name: "onboarding_submitted",
    language: "en",
    description: "Notify driver their application is under review",
  },
  onboarding_approved: {
    name: "onboarding_approved",
    language: "en",
    description: "Notify driver their profile is approved",
  },
  onboarding_rejected: {
    name: "onboarding_rejected",
    language: "en",
    description: "Notify driver their application needs resubmission",
  },
  // ── Compliance ────────────────────────────────────────────────────────
  compliance_expiry_reminder: {
    name: "compliance_expiry_reminder",
    language: "en",
    description: "Remind driver of upcoming document expiry (KIV — not yet wired)",
  },
  // ── Order lifecycle ───────────────────────────────────────────────────
  order_driver_assigned: {
    name: "order_driver_assigned",
    language: "en",
    description: "Notify requestor, passenger, and driver that a driver has been assigned",
  },
  order_driver_otw: {
    name: "order_driver_otw",
    language: "en",
    description: "Notify requestor and passenger that driver is on the way",
  },
  order_driver_arrived: {
    name: "order_driver_arrived",
    language: "en",
    description: "Notify requestor and passenger that driver has arrived at pickup",
  },
  order_trip_completed: {
    name: "order_trip_completed",
    language: "en",
    description: "Notify requestor and passenger that the trip is complete",
  },
} as const;

export type TemplateKey = keyof typeof WHATSAPP_TEMPLATES;
