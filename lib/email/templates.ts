const base = (content: string) => `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:560px;margin:40px auto;background:#111;border:1px solid #222;border-radius:8px;overflow:hidden;">
    <div style="background:#161616;border-bottom:1px solid #222;padding:20px 28px;display:flex;align-items:center;gap:10px;">
      <span style="font-size:15px;font-weight:700;color:#fff;letter-spacing:0.5px;">LyPX</span>
      <span style="font-size:11px;color:#555;font-weight:500;">Operations Platform</span>
    </div>
    <div style="padding:28px;">
      ${content}
    </div>
    <div style="border-top:1px solid #1a1a1a;padding:16px 28px;">
      <p style="margin:0;font-size:11px;color:#444;">This is an automated message from LyPX Operations · workspace.lymo-x.com</p>
    </div>
  </div>
</body>
</html>`;

const h1 = (text: string) =>
  `<h1 style="margin:0 0 6px;font-size:18px;font-weight:700;color:#fff;">${text}</h1>`;

const subtitle = (text: string) =>
  `<p style="margin:0 0 24px;font-size:13px;color:#666;">${text}</p>`;

const row = (label: string, value: string) => `
  <tr>
    <td style="padding:8px 0;font-size:12px;color:#666;width:140px;vertical-align:top;">${label}</td>
    <td style="padding:8px 0;font-size:13px;color:#ddd;font-weight:500;">${value}</td>
  </tr>`;

const table = (rows: string) =>
  `<table style="width:100%;border-collapse:collapse;margin-bottom:24px;">${rows}</table>`;

const btn = (label: string, href: string) =>
  `<a href="${href}" style="display:inline-block;background:#d4a017;color:#000;font-size:13px;font-weight:700;padding:10px 22px;border-radius:4px;text-decoration:none;">${label}</a>`;

const divider = () => `<hr style="border:none;border-top:1px solid #1e1e1e;margin:24px 0;">`;

// ── Templates ─────────────────────────────────────────────────────────────

export function driverSubmissionEmail(params: {
  driverName:     string;
  phone:          string;
  vehiclePlate:   string | null;
  isResubmission: boolean;
  reviewUrl:      string;
}) {
  const { driverName, phone, vehiclePlate, isResubmission, reviewUrl } = params;
  const subject = isResubmission
    ? `Resubmission — ${driverName}`
    : `New driver application — ${driverName}`;

  const html = base(`
    ${h1(isResubmission ? "Driver Resubmission" : "New Driver Application")}
    ${subtitle(isResubmission ? "A driver has updated and resubmitted their profile." : "A driver has completed self-onboarding and is pending review.")}
    ${table(
      row("Name",    driverName || "—") +
      row("Phone",   phone) +
      row("Vehicle", vehiclePlate ?? "Not provided") +
      row("Type",    isResubmission ? "Resubmission" : "New application")
    )}
    ${btn("Review Application", reviewUrl)}
  `);

  return { subject, html };
}

export function driverApprovedEmail(params: {
  driverName: string;
  operatorName: string;
}) {
  const { driverName, operatorName } = params;
  const subject = `Driver approved — ${driverName}`;

  const html = base(`
    ${h1("Driver Profile Approved")}
    ${subtitle(`${driverName} has been approved and is now active on the platform.`)}
    ${table(
      row("Driver",   driverName) +
      row("Operator", operatorName)
    )}
    ${divider()}
    <p style="margin:0;font-size:13px;color:#666;">
      The driver can now be assigned to orders.
    </p>
  `);

  return { subject, html };
}

export function driverRejectedEmail(params: {
  driverName:      string;
  operatorName:    string;
  rejectionReason: string;
}) {
  const { driverName, operatorName, rejectionReason } = params;
  const subject = `Driver application returned — ${driverName}`;

  const html = base(`
    ${h1("Application Needs Resubmission")}
    ${subtitle(`${driverName}'s application has been returned for the following reason:`)}
    <div style="background:#1a1212;border:1px solid #3a1a1a;border-radius:6px;padding:14px 18px;margin-bottom:24px;">
      <p style="margin:0;font-size:13px;color:#f87171;">${rejectionReason}</p>
    </div>
    ${table(
      row("Driver",   driverName) +
      row("Operator", operatorName)
    )}
    <p style="margin:0;font-size:13px;color:#666;">
      The driver will need to correct and resubmit their application.
    </p>
  `);

  return { subject, html };
}

export function orderConfirmationEmail(params: {
  reference:       string;
  pickupTime:      string;
  pickupLocation:  string;
  dropoffLocation: string;
  passengerName:   string;
  driverName?:     string;
  accountName:     string;
}) {
  const { reference, pickupTime, pickupLocation, dropoffLocation, passengerName, driverName, accountName } = params;
  const subject = `Order confirmed — ${reference}`;

  const html = base(`
    ${h1("Order Confirmation")}
    ${subtitle(`Trip details for ${accountName}`)}
    ${table(
      row("Reference",   reference) +
      row("Pickup",      pickupTime) +
      row("From",        pickupLocation) +
      row("To",          dropoffLocation) +
      row("Passenger",   passengerName) +
      row("Driver",      driverName ?? "To be assigned")
    )}
    <p style="margin:0;font-size:13px;color:#666;">
      You will receive updates via WhatsApp as your trip progresses.
    </p>
  `);

  return { subject, html };
}
