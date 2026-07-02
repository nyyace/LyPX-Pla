// WhatsApp Cloud API webhook event shape (the subset this app reads).
// https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks/components

export interface WhatsAppInboundMessage {
  from?: string;
  id?: string;
  type?: string;
  text?: { body?: string };
}

export interface WhatsAppStatusUpdate {
  id?: string;
  status?: string;
  pricing?: {
    billable?: boolean;
    pricing_model?: string;
    category?: string;
  };
}

export interface WhatsAppChangeValue {
  metadata?: { phone_number_id?: string };
  messages?: WhatsAppInboundMessage[];
  statuses?: WhatsAppStatusUpdate[];
}

export interface WhatsAppChange {
  field?: string;
  value?: WhatsAppChangeValue;
}

export interface WhatsAppWebhookEntry {
  changes?: WhatsAppChange[];
}

export interface WhatsAppWebhookPayload {
  entry?: WhatsAppWebhookEntry[];
}

export function parseWhatsAppWebhookPayload(rawBody: string): WhatsAppWebhookPayload | null {
  try {
    const parsed: unknown = JSON.parse(rawBody);
    if (typeof parsed !== "object" || parsed === null) return null;
    return parsed as WhatsAppWebhookPayload;
  } catch {
    return null;
  }
}
