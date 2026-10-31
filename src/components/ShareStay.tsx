"use client";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { IconChevronLeft } from "@/components/icons";

/** Share a public property page only, never the current query, booking route or hash. */
export function publicStayShareUrl(origin: string, pathname: string): string | null {
  try {
    const base = new URL(origin);
    if (!["https:", "http:"].includes(base.protocol) || base.username || base.password) return null;
    const path = pathname.split(/[?#]/, 1)[0];
    if (path !== "/" && !/^\/properties\/[a-z0-9-]+\/?$/.test(path)) return null;
    return new URL(path, base.origin).href;
  } catch { return null; }
}

export default function ShareStay({ propertyName }: { propertyName: string }) {
  const [url, setUrl] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const revision = useRef(0);
  useEffect(() => () => { revision.current++; }, []);
  function close() { revision.current++; setUrl(null); setStatus(""); }
  const trigger = useRef<HTMLButtonElement>(null);
  const dialog = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!url) return;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog.current?.querySelector<HTMLButtonElement>("button")?.focus();
    function key(event: KeyboardEvent) {
      if (event.key === "Escape") { event.preventDefault(); close(); }
      if (event.key !== "Tab") return;
      const controls = Array.from(dialog.current?.querySelectorAll<HTMLElement>('button, input') ?? []);
      const first = controls[0], last = controls.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    }
    document.addEventListener("keydown", key);
    return () => { document.removeEventListener("keydown", key); document.body.style.overflow = overflow; trigger.current?.focus(); };
  }, [url]);
  function open() {
    revision.current++;
    const safe = publicStayShareUrl(window.location.origin, window.location.pathname);
    setStatus(safe ? "" : "A public stay link is not available on this page.");
    setUrl(safe);
  }
  async function share() {
    if (!url) return;
    const current = revision.current;
    try { await navigator.share({ title: propertyName, url }); if (current === revision.current) setStatus("Share sheet closed. No message was sent by this website."); }
    catch (error) { if (current === revision.current) setStatus(error instanceof Error && error.name === "AbortError" ? "Sharing cancelled." : "Sharing did not complete. You can copy the link instead."); }
  }
  async function copy() {
    if (!url) return;
    const current = revision.current;
    try { await navigator.clipboard.writeText(url); if (current === revision.current) setStatus("Public stay link copied."); }
    catch { if (current === revision.current) setStatus("Could not copy automatically. Select the link and use your device’s Copy command."); }
  }
  return <>
    <button ref={trigger} type="button" onClick={open} aria-label="Share this stay" className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full bg-paper/75 text-ink backdrop-blur-sm md:right-6 md:top-6"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-4 w-4" aria-hidden="true"><path d="M12 16V2m-5 5 5-5 5 5M5 11H3v11h18V11h-2" /></svg></button>
    {!url && status && <span role="status" className="absolute right-4 top-20 max-w-xs rounded-lg bg-paper p-3 text-sm">{status}</span>}
    {url && createPortal(<div ref={dialog} role="dialog" aria-modal="true" onClick={event => { if (event.target === event.currentTarget) close(); }} aria-label="Share this stay" className="fixed inset-0 z-[70] flex items-center justify-center overflow-y-auto bg-ink/65 p-5 text-ink"><div className="w-full max-w-md rounded-2xl bg-paper p-6"><button type="button" onClick={close} className="mb-5 flex min-h-11 items-center gap-2 text-sm"><IconChevronLeft className="h-5 w-5" />Back</button><h2 className="font-display text-3xl">Share this stay.</h2><p className="my-4 text-sm text-stone-600">Only the public page link is shared. Your dates, booking and personal details are not included.</p><label className="block text-sm">Public stay link<input readOnly value={url} onFocus={event => event.target.select()} className="mt-2 min-h-11 w-full rounded-lg border border-stone-300 bg-white/50 px-3" /></label><div className="mt-5 flex flex-wrap gap-3">{typeof navigator !== "undefined" && typeof navigator.share === "function" && <button type="button" onClick={share} className="min-h-11 rounded-full bg-ink px-5 text-paper">Choose how to share</button>}<button type="button" onClick={copy} className="min-h-11 rounded-full border border-stone-300 px-5">Copy link</button></div><p role="status" aria-live="polite" className="mt-4 text-sm">{status}</p></div></div>, document.body)}
  </>;
}
