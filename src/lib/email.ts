/**
 * Booking emails: guest confirmation + host notification.
 *
 * Transport:
 * - If RESEND_API_KEY is set → sent via the Resend REST API.
 * - Otherwise → rendered HTML is written to ./.dev-emails/*.html (dev
 *   logger fallback) and the "send" is logged to the console.
 *
 * NEVER throws: a failed email must never fail a booking. All errors are
 * logged and swallowed — routes call these after the booking state change
 * has already been persisted.
 *
 * Env:
 *   RESEND_API_KEY      — enables real sending via Resend
 *   BOOKING_FROM_EMAIL  — From: address (default "Casa Pacifica <bookings@casapacifica.example>")
 *   HOST_NOTIFY_EMAIL   — where host notifications go (default: the From address)
 */

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
        `<td style="padding:6px 0;text-align:right;white-space:nowrap;">${esc(formatCents(li.amountCents))}</td></tr>`
    )
    .join("");
}

function shell(title: string, body: string): string {
  return `<!doctype html><html><body style="font-family:system-ui,-apple-system,sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#1a1a1a;">
<h1 style="font-size:22px;">${esc(title)}</h1>
${body}
<hr style="border:none;border-top:1px solid #ddd;margin:24px 0;">
<p style="font-size:12px;color:#888;">${esc("Casa Pacifica · Operated by Kipper Property Management")}</p>
</body></html>`;
}

function guestHtml(booking: Booking, property: Property): string {
  const g = booking.guest;
  const totalGuests = booking.guests.adults + booking.guests.children + booking.guests.infants;
  return shell(
    `Booking confirmed — ${esc(property.name)}`,
    `<p>Hi ${esc(g.name)},</p>
<p>Your stay at <strong>${esc(property.name)}</strong> is confirmed. Your booking reference is <strong>${esc(booking.reference)}</strong> — please keep it handy.</p>
<table style="width:100%;border-collapse:collapse;margin:16px 0;">
<tr><td style="padding:6px 0;color:#666;">Check-in</td><td style="text-align:right;"><strong>${esc(booking.checkIn)}</strong> from ${esc(property.checkInTime)}</td></tr>
<tr><td style="padding:6px 0;color:#666;">Check-out</td><td style="text-align:right;"><strong>${esc(booking.checkOut)}</strong> by ${esc(property.checkOutTime)}</td></tr>
<tr><td style="padding:6px 0;color:#666;">Guests</td><td style="text-align:right;">${totalGuests} (${booking.guests.adults} adult${booking.guests.adults === 1 ? "" : "s"}${booking.guests.children ? `, ${booking.guests.children} child${booking.guests.children === 1 ? "" : "ren"}` : ""}${booking.guests.infants ? `, ${booking.guests.infants} infant${booking.guests.infants === 1 ? "" : "s"}` : ""})${booking.pets ? ` · ${booking.pets} pet` : ""}</td></tr>
<tr><td style="padding:6px 0;color:#666;">Address</td><td style="text-align:right;">${esc(property.address)}, ${esc(property.city)}, ${esc(property.state)} ${esc(property.zip)}</td></tr>
<tr><td style="padding:6px 0;color:#666;">Check-in method</td><td style="text-align:right;">${esc(property.checkInMethod)}</td></tr>
</table>
<h2 style="font-size:16px;">Charges</h2>
<table style="width:100%;border-collapse:collapse;">${lineItemsHtml(booking)}
<tr><td style="padding:10px 0;border-top:2px solid #1a1a1a;"><strong>Total</strong></td><td style="padding:10px 0;border-top:2px solid #1a1a1a;text-align:right;"><strong>${esc(formatCents(booking.totalCents))}</strong></td></tr></table>
<h2 style="font-size:16px;">Good to know</h2>
<ul><li>Quiet hours: ${esc(property.quietHours)}</li><li>Wifi details are in this email's follow-up before arrival.</li><li>Please review the house rules in your booking details.</li></ul>
<p>We look forward to hosting you!<br>— Kipper, Kipper Property Management</p>`
  );
}

function hostHtml(booking: Booking, property: Property): string {
  const g = booking.guest;
  return shell(
    `New direct booking ${esc(booking.reference)}`,
    `<p>A new booking was just confirmed on the direct site:</p>
<table style="width:100%;border-collapse:collapse;margin:16px 0;">
<tr><td style="padding:6px 0;color:#666;">Reference</td><td style="text-align:right;"><strong>${esc(booking.reference)}</strong></td></tr>
<tr><td style="padding:6px 0;color:#666;">Property</td><td style="text-align:right;">${esc(property.name)}</td></tr>
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

async function deliver(to: string, subject: string, html: string, kind: "guest" | "host", reference: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (apiKey) {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from: fromAddress(), to: [to], subject, html }),
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Resend ${res.status}: ${body}`);
    }
    console.log(`[email] sent ${kind} email for ${reference} to ${to} via Resend`);
    return;
  }
  // Dev logger fallback: write the rendered email to disk.
  const dir = path.join(process.cwd(), ".dev-emails");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `${Date.now()}-${kind}-${reference}.html`);
  fs.writeFileSync(file, html, "utf8");
  console.log(`[email:dev] ${kind} email for ${reference} → ${to} written to ${file} (RESEND_API_KEY not set)`);
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
        `<p style="font-size:12px;color:#888;">Sent via the Kipper Property Management contact form.</p>`,
    );
    await deliver(
      hostAddress(),
      `Contact form: ${name}`,
      html,
      "host",
      `contact-${Date.now()}`,
    );
  } catch (err) {
    console.error(`[email] FAILED contact message from ${email}:`, err);
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
      booking.reference
    );
  } catch (err) {
    console.error(`[email] FAILED guest confirmation for ${booking.reference}:`, err);
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
      booking.reference
    );
  } catch (err) {
    console.error(`[email] FAILED host notification for ${booking.reference}:`, err);
  }
}
