"use client";
/**
 * ContactForm — name / email / message with client-side validation,
 * POSTs to /api/contact (which validates again server-side).
 * No business email/phone/address is published anywhere on this page —
 * messages go to the host inbox; without a Resend key they land in the
 * dev email log (documented in docs/API.md).
 */
import { useState } from "react";
import { Button, Field } from "@/components/ui";
import { IconCheck, IconAlert } from "@/components/icons";
import { cn } from "@/components/cn";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ContactForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<{ name?: string; email?: string; message?: string }>({});
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "failed">("idle");
  const [serverError, setServerError] = useState("");

  function validate() {
    const e: typeof errors = {};
    if (!name.trim()) e.name = "Please enter your name.";
    if (!EMAIL_RE.test(email.trim())) e.email = "Please enter a valid email address.";
    if (!message.trim()) e.message = "Please enter a message.";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function submit(ev: React.FormEvent) {
    ev.preventDefault();
    if (status === "sending") return;
    setServerError("");
    if (!validate()) return;
    setStatus("sending");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), message: message.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Something went wrong. Please try again.");
      setStatus("sent");
    } catch (err) {
      setServerError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setStatus("failed");
    }
  }

  if (status === "sent") {
    return (
      <div className="rounded-2xl border border-stone-200 bg-white p-8 text-center shadow-card">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-moss/10 text-moss">
          <IconCheck className="h-6 w-6" />
        </span>
        <h2 className="mt-4 font-display text-2xl font-medium text-ink">Message sent</h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-stone-600">
          Thanks, {name.trim().split(" ")[0]} — your message is on its way to Casa Pacifica.
          We read everything and reply as soon as we can.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="rounded-2xl border border-stone-200 bg-white p-6 shadow-card sm:p-8">
      <div className="grid gap-5">
        <Field
          label="Your name"
          type="text"
          autoComplete="name"
          placeholder="Jane Doe"
          value={name}
          onChange={(e) => setName(e.target.value)}
          error={errors.name}
        />
        <Field
          label="Email"
          type="email"
          autoComplete="email"
          placeholder="jane@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={errors.email}
          hint="We'll only use this to reply to your message."
        />
        <div>
          <label htmlFor="contact-message" className="block text-sm font-medium text-ink">
            Message
          </label>
          <textarea
            id="contact-message"
            rows={6}
            placeholder="Tell us about your trip, your dates, or anything else…"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            aria-invalid={!!errors.message}
            className={cn(
              "mt-1.5 block w-full rounded-2xl border bg-white px-4 py-3 text-base text-ink",
              "placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-clay focus:ring-offset-1 focus:ring-offset-paper",
              errors.message ? "border-red-400" : "border-stone-300",
            )}
          />
          {errors.message && <p className="mt-1.5 text-sm text-red-600">{errors.message}</p>}
        </div>
        {/* Honeypot — invisible to humans, bots fill it. */}
        <div className="hidden" aria-hidden>
          <label>
            Company
            <input type="text" name="company" tabIndex={-1} autoComplete="off" />
          </label>
        </div>
        {serverError && (
          <p role="alert" className="flex items-center gap-2 text-sm text-red-600">
            <IconAlert className="h-4 w-4 shrink-0" /> {serverError}
          </p>
        )}
        <Button type="submit" size="lg" disabled={status === "sending"} className="w-full sm:w-auto">
          {status === "sending" ? "Sending…" : "Send message"}
        </Button>
      </div>
    </form>
  );
}
