import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export const FROM_ADDRESS = "LyPX <noreply@workspace.lymo-x.com>";
export const ADMIN_EMAIL  = process.env.ADMIN_EMAIL ?? "eric@lymo-x.com";

export interface SendEmailParams {
  to:      string | string[];
  subject: string;
  html:    string;
  from?:   string;
}

export async function sendEmail({ to, subject, html, from = FROM_ADDRESS }: SendEmailParams): Promise<void> {
  if (!process.env.RESEND_API_KEY) {
    console.warn("[Email] RESEND_API_KEY not set — skipping send:", subject);
    return;
  }
  const { error } = await resend.emails.send({ from, to, subject, html });
  if (error) {
    console.error("[Email] Send failed:", error);
    throw new Error(`Email send failed: ${error.message}`);
  }
}
