export type TemplateRecipientType = "requestor" | "passenger" | "driver";

export interface TemplateDefinition {
  templateName: string;
  language: string;
  recipients: TemplateRecipientType[];
  resolveVariables: (ctx: OrderContext) => string[];
}

export interface OrderContext {
  jobReference: string;
  serviceType: string;
  pickupTime: Date;
  timezone: string;
  pickupAddress: string;
  dropoffAddress: string | null;
  driverFirstName: string;
  driverLastName: string;
  driverPhone: string;
  vehicleColour: string | null;
  vehicleMake: string | null;
  vehicleModel: string | null;
  vehiclePlate: string | null;
}

const SERVICE_TYPE_LABELS: Record<string, string> = {
  p2p:              "P2P Transfer",
  departure:        "Airport Departure",
  arrival_mng:      "Airport Arrival (Meet & Greet)",
  arrival_driveway: "Airport Arrival (Driveway)",
  disposal:         "Disposal / Hourly",
  flexible:         "Flexible Booking",
};

function vehicleDesc(ctx: OrderContext): string {
  return [ctx.vehicleColour, ctx.vehicleMake, ctx.vehicleModel].filter(Boolean).join(" ") || "—";
}

export const TEMPLATE_REGISTRY: Record<string, TemplateDefinition> = {
  "order.assigned": {
    templateName: "order_driver_assigned",
    language: "en",
    recipients: ["requestor", "passenger", "driver"],
    resolveVariables: (ctx: OrderContext): string[] => {
      const localDate = new Date(ctx.pickupTime).toLocaleDateString("en-GB", {
        timeZone: ctx.timezone,
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
      const localTime = new Date(ctx.pickupTime).toLocaleTimeString("en-GB", {
        timeZone: ctx.timezone,
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });
      return [
        ctx.jobReference,
        SERVICE_TYPE_LABELS[ctx.serviceType] ?? ctx.serviceType,
        localDate,
        localTime,
        ctx.pickupAddress,
        ctx.dropoffAddress ?? "—",
        `${ctx.driverFirstName} ${ctx.driverLastName}`.trim(),
        ctx.driverPhone,
        vehicleDesc(ctx),
        ctx.vehiclePlate ?? "—",
      ];
    },
  },

  "order.en_route": {
    templateName: "order_driver_otw",
    language: "en",
    recipients: ["requestor", "passenger"],
    resolveVariables: (ctx: OrderContext): string[] => [
      ctx.jobReference,
      `${ctx.driverFirstName} ${ctx.driverLastName}`.trim(),
      vehicleDesc(ctx),
      ctx.vehiclePlate ?? "—",
    ],
  },

  "order.arrived": {
    templateName: "order_driver_arrived",
    language: "en",
    recipients: ["requestor", "passenger"],
    resolveVariables: (ctx: OrderContext): string[] => [
      ctx.jobReference,
      `${ctx.driverFirstName} ${ctx.driverLastName}`.trim(),
      ctx.vehiclePlate ?? "—",
    ],
  },

  "order.started": {
    templateName: "order_trip_started",
    language: "en",
    recipients: ["requestor", "passenger"],
    resolveVariables: (ctx: OrderContext): string[] => [
      ctx.jobReference,
      `${ctx.driverFirstName} ${ctx.driverLastName}`.trim(),
      vehicleDesc(ctx),
      ctx.vehiclePlate ?? "—",
    ],
  },

  "order.completed": {
    templateName: "order_trip_completed",
    language: "en",
    recipients: ["requestor", "passenger"],
    resolveVariables: (ctx: OrderContext): string[] => [
      ctx.jobReference,
    ],
  },
};
