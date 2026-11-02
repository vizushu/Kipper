import { isPublicPreview } from "./booking-launch";
/** Legacy render helpers; active booking delivery uses the durable outbox.
 * Explicit delivery approval is required. Errors are redacted, never provider bodies or guest data.
 */
import {configuredReplyTo,liveEmailDeliveryConfigured,validateDeliveryEnvelope} from "./email-delivery";
import {storedPaymentMode} from "./payment-mode";

import fs from "node:fs";
import path from "node:path";
import { formatCents, type Booking, type Property } from "./types";

function fromAddress(): string {
  return process.env.BOOKING_FROM_EMAIL ?? "Casa Pacifica <bookings@casapacifica.example>";
}

function hostAddress(): string {
  return process.env.HOST_NOTIFY_EMAIL ?? fromAddress();
}

function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}

function lineItemsHtml(booking: Booking): string {
  return booking.lineItems
    .map(
      (li) =>
        `<tr><td style="padding:6px 0;">${esc(li.label)}${li.detail ? `<br><small style="color:#666;">${esc(li.detail)}</small>` : ""}</td>` +
        `<td style="padding:6px 0;text-align:right;white-space:nowrap;">${li.amountCents===0&&li.referenceAmountCents?`<del>${esc(formatCents(li.referenceAmountCents))}</del> → `:""}${esc(formatCents(li.amountCents))}</td></tr>`
    )
    .join("");
}

function shell(title: string, body: string): string {
  return `<!doctype html><html><body style="font-family:system-ui,-apple-system,sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#1a1a1a;">
<h1 style="font-size:22px;">${esc(title)}</h1>
${body}
<hr style="border:none;border-top:1px solid #ddd;margin:24px 0;">
<p style="font-size:12px;color:#888;">${esc("Casa Pacifica · San Diego")}</p>
</body></html>`;
}

function guestHtml(booking: Booking, property: Property): string {
  const g = booking.guest;
  const totalGuests = booking.guests.adults + booking.guests.children + booking.guests.infants;
  return shell(
    `Booking confirmed — ${esc(booking.staySnapshot?.propertyName ?? property.name)}`,
    `<p>Hi ${esc(g.name)},</p>
<p>Your stay at <strong>${esc(booking.staySnapshot?.propertyName ?? property.name)}</strong> is confirmed. Your booking reference is <strong>${esc(booking.reference)}</strong> — please keep it handy.</p>
<table style="width:100%;border-collapse:collapse;margin:16px 0;">
<tr><td style="padding:6px 0;color:#666;">Check-in</td><td style="text-align:right;"><strong>${esc(booking.checkIn)}</strong> from ${esc(booking.staySnapshot?.checkInTime ?? "See original booking terms")}</td></tr>
<tr><td style="padding:6px 0;color:#666;">Check-out</td><td style="text-align:right;"><strong>${esc(booking.checkOut)}</strong> by ${esc(booking.staySnapshot?.checkOutTime ?? "See original booking terms")}</td></tr>
<tr><td style="padding:6px 0;color:#666;">Guests</td><td style="text-align:right;">${totalGuests} (${booking.guests.adults} adult${booking.guests.adults === 1 ? "" : "s"}${booking.guests.children ? `, ${booking.guests.children} child${booking.guests.children === 1 ? "" : "ren"}` : ""}${booking.guests.infants ? `, ${booking.guests.infants} infant${booking.guests.infants === 1 ? "" : "s"}` : ""})${booking.pets ? ` · ${booking.pets} pet` : ""}</td></tr>
<tr><td style="padding:6px 0;color:#666;">Address</td><td style="text-align:right;">${esc(property.address)}, ${esc(property.city)}, ${esc(property.state)} ${esc(property.zip)}</td></tr>
<tr><td style="padding:6px 0;color:#666;">Check-in method</td><td style="text-align:right;">${esc(property.checkInMethod)}</td></tr>
</table>
<h2 style="font-size:16px;">Charges</h2>
<table style="width:100%;border-collapse:collapse;">${lineItemsHtml(booking)}
<tr><td style="padding:10px 0;border-top:2px solid #1a1a1a;"><strong>Total</strong></td><td style="padding:10px 0;border-top:2px solid #1a1a1a;text-align:right;"><strong>${esc(formatCents(booking.totalCents))}</strong></td></tr></table>
<p>Accommodation: ${esc(booking.staySnapshot?.label ?? "See original booking terms")}</p>
<p>Cancellation: ${esc(booking.staySnapshot?.cancellationPolicy ?? "See original booking terms")}</p>
<h2 style="font-size:16px;">Good to know</h2>
<ul><li>Quiet hours: ${esc(property.quietHours)}</li><li>Contact your host for arrival and Wi-Fi details.</li><li>Please review the house rules in your booking details.</li></ul>
<p>For stay questions, consult your verified host contact.<br>— Casa Pacifica</p>`
  );
}

function hostHtml(booking: Booking, property: Property): string {
  const g = booking.guest;
  return shell(
    `New direct booking ${esc(booking.reference)}`,
    `<p>A new booking was just confirmed on the direct site:</p>
<table style="width:100%;border-collapse:collapse;margin:16px 0;">
<tr><td style="padding:6px 0;color:#666;">Reference</td><td style="text-align:right;"><strong>${esc(booking.reference)}</strong></td></tr>
<tr><td style="padding:6px 0;color:#666;">Property</td><td style="text-align:right;">${esc(booking.staySnapshot?.propertyName ?? property.name)}</td></tr>
<tr><td style="padding:6px 0;color:#666;">Dates</td><td style="text-align:right;">${esc(booking.checkIn)} → ${esc(booking.checkOut)} (${booking.nights} night${booking.nights === 1 ? "" : "s"})</td></tr>
<tr><td style="padding:6px 0;color:#666;">Guest</td><td style="text-align:right;">${esc(g.name)} &lt;${esc(g.email)}&gt;${g.phone ? ` · ${esc(g.phone)}` : ""}</td></tr>
<tr><td style="padding:6px 0;color:#666;">Party</td><td style="text-align:right;">${booking.guests.adults}A / ${booking.guests.children}C / ${booking.guests.infants}I${booking.pets ? ` · ${booking.pets} pet(s)` : ""}</td></tr>
<tr><td style="padding:6px 0;color:#666;">Total</td><td style="text-align:right;"><strong>${esc(formatCents(booking.totalCents))}</strong></td></tr>
<tr><td style="padding:6px 0;color:#666;">Payment</td><td style="text-align:right;">${esc(booking.paymentStatus)}${booking.stripePaymentIntentId ? ` (${esc(booking.stripePaymentIntentId)})` : ""}</td></tr>
</table>
<h2 style="font-size:16px;">Charges</h2>
<table style="width:100%;border-collapse:collapse;">${lineItemsHtml(booking)}</table>`
  );
}

async function deliver(to: string, subject: string, html: string, kind: "guest" | "host", reference: string, booking?: Booking): Promise<void> {
  if (process.env.STAGING_TEST_MODE === "true") throw new Error("Staging delivery blocked");
  if (isPublicPreview()) throw new Error("Preview delivery blocked");
  const apiKey = process.env.RESEND_API_KEY;
  const replyTo=configuredReplyTo();
  if (liveEmailDeliveryConfigured()) {
    if(booking&&(storedPaymentMode(booking.paymentMode)!=='live'||booking.paymentStatus!=='paid'||booking.status!=='confirmed'))throw new Error('Live delivery is not enabled for this message');
    validateDeliveryEnvelope({from:fromAddress(),to,subject,replyTo});
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from: fromAddress(), to: [to], subject, html, ...(replyTo?{reply_to:replyTo}:{}) }),
    });
    if (!res.ok) {
      throw new Error("Email provider did not acknowledge delivery");
    }
    return;
  }
  if(process.env.EMAIL_DELIVERY_MODE!=="local")throw new Error("Email delivery is disabled");
  // Explicit local simulation only; no guest/provider output in logs.
  const dir = path.join(process.cwd(), ".dev-emails");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true, mode:0o700 });
  const file = path.join(dir, `${Date.now()}-${kind}-${reference}.html`);
  fs.writeFileSync(file, html, {encoding:"utf8",mode:0o600});
}

/** Contact-form message → host inbox. Never throws — logs and continues on failure. */
export async function sendContactMessage(
  name: string,
  email: string,
  message: string,
): Promise<void> {
  try {
    const html = shell(
      `New contact message from ${esc(name)}`,
      `<p><strong>From:</strong> ${esc(name)} &lt;${esc(email)}&gt;</p>` +
        `<p>${esc(message).replace(/\n/g, "<br>")}</p>` +
        `<p style="font-size:12px;color:#888;">Sent via the Casa Pacifica contact form.</p>`,
    );
    await deliver(
      hostAddress(),
      `Contact form: ${name}`,
      html,
      "host",
      `contact-${Date.now()}`,
    );
  } catch (err) {
    console.error("[email] Contact delivery failed");
  }
}

/** Guest booking confirmation. Never throws — logs and continues on failure. */
export async function sendBookingConfirmation(booking: Booking, property: Property): Promise<void> {
  try {
    await deliver(
      booking.guest.email,
      `Booking confirmed — ${property.name} (${booking.reference})`,
      guestHtml(booking, property),
      "guest",
      booking.reference,
      booking
    );
  } catch (err) {
    console.error("[email] Guest delivery failed");
  }
}

/** Host notification for a new booking. Never throws — logs and continues on failure. */
export async function sendHostNotification(booking: Booking, property: Property): Promise<void> {
  try {
    await deliver(
      hostAddress(),
      `New direct booking ${booking.reference} — ${booking.checkIn} → ${booking.checkOut}`,
      hostHtml(booking, property),
      "host",
      booking.reference,
      booking
    );
  } catch (err) {
    console.error("[email] Host delivery failed");
  }
}
