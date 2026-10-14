"use client";
/**
 * /admin/login — ADMIN_SECRET → session cookie via POST /api/admin/login.
 * Not guarded by the admin layout (it's the entry point).
 */
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Field } from "@/components/ui";
import { IconLock } from "@/components/icons";

export default function AdminLoginPage() {
  const router = useRouter();
  const [secret, setSecret] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ secret }),
      });
      if (!res.ok) {
        setError("That secret didn't work. Try again.");
        return;
      }
      router.push("/admin");
      router.refresh();
    } catch {
      setError("Couldn't reach the server. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-paper px-4">
      <form
        onSubmit={submit}
        className="w-full max-w-sm rounded-2xl border border-stone-200 bg-white p-8 shadow-card"
      >
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-ink text-paper">
          <IconLock className="h-5 w-5" />
        </span>
        <h1 className="mt-4 font-display text-2xl font-medium text-ink">Host sign in</h1>
        <p className="mt-1 text-sm text-stone-500">
          Enter your admin secret to manage Casa Pacifica bookings.
        </p>
        <div className="mt-5">
          <Field
            label="Admin secret"
            type="password"
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            autoComplete="current-password"
            error={error}
          />
        </div>
        <Button type="submit" disabled={loading || !secret} className="mt-5 w-full">
          {loading ? "Signing in…" : "Sign in"}
        </Button>
      </form>
    </div>
  );
}
