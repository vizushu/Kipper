import { isPublicPreview } from "@/lib/booking-launch";
/**
 * POST /api/contact — contact-form submission.
 *
 * Server-side validation (name/email/message). Without a Resend key the
 * message is logged to ./.dev-emails/ via the same dev-logger pattern as
 * booking emails; with a key it is emailed to the host inbox. Never throws.
 *
 * Spam: a honeypot field ("company") — submissions that fill it are
 * silently accepted (200) and discarded.
 */
import { NextRequest, NextResponse } from "next/server";
import { sendContactMessage } from "@/lib/email";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_NAME = 120;
const MAX_EMAIL = 200;
const MAX_MESSAGE = 5000;

function bad(message: string) {
  return NextResponse.json({ error: message, code: "INVALID_REQUEST" }, { status: 400 });
}

export async function POST(req: NextRequest) {
  if (isPublicPreview()) return NextResponse.json({error:"This preview does not accept messages or guest data."},{status:503,headers:{"Cache-Control":"no-store"}});
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return bad("Invalid request body.");
  }
  const b = (body ?? {}) as Record<string, unknown>;

  // Honeypot: bots fill it, humans don't. Silently discard.
  if (typeof b.company === "string" && b.company.trim() !== "") {
    return NextResponse.json({ ok: true });
  }

  const name = typeof b.name === "string" ? b.name.trim() : "";
  const email = typeof b.email === "string" ? b.email.trim() : "";
  const message = typeof b.message === "string" ? b.message.trim() : "";

  if (!name || name.length > MAX_NAME) return bad("Please enter your name.");
  if (!email || email.length > MAX_EMAIL || !EMAIL_RE.test(email))
    return bad("Please enter a valid email address.");
  if (!message || message.length > MAX_MESSAGE)
    return bad("Please enter a message.");

  await sendContactMessage(name, email, message);
  return NextResponse.json({ ok: true });
}
