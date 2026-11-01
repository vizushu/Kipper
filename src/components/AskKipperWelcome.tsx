"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { BackButton } from "@/components/BackControl";
import KipperCharacter from "@/components/KipperCharacter";

const SEEN_KEY = "kipper-welcome-v1";

/** A character-led introduction, not an AI chat or a message submission surface. */
export default function AskKipperWelcome() {
  const dialog = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLButtonElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  const [open, setOpen] = useState(false);

  const show = useCallback(() => {
    if (!dialog.current || dialog.current.open) return;
    previousFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    dialog.current.showModal(); setOpen(true); heading.current?.focus();
    try { sessionStorage.setItem(SEEN_KEY, "seen"); } catch { /* Storage is optional. */ }
  }, []);
  const close = useCallback(() => {
    dialog.current?.close(); setOpen(false);
    const target = previousFocus.current;
    if (target?.isConnected && target !== document.body) target.focus(); else opener.current?.focus();
  }, []);

  useEffect(() => {
    let seen = false;
    try { seen = sessionStorage.getItem(SEEN_KEY) === "seen"; } catch { /* Still usable without storage. */ }
    if (!seen) show();
  }, [show]);
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, [open]);

  function browseAnswers() {
    close();
    const target = document.getElementById("stay-guide-title");
    target?.setAttribute("tabindex", "-1"); target?.focus({ preventScroll: true });
    target?.scrollIntoView({ block: "start", behavior: "instant" });
  }

  return <>
    <button ref={opener} type="button" onClick={show} className="mt-3 inline-flex min-h-11 items-center text-sm text-moss underline underline-offset-4" aria-haspopup="dialog">Meet Kipper</button>
    <dialog ref={dialog} aria-labelledby="kipper-welcome-title" aria-describedby="kipper-welcome-status" onCancel={event => { event.preventDefault(); close(); }} onClick={event => { if (event.target === event.currentTarget) { const box = event.currentTarget.getBoundingClientRect(); if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) close(); } }} className="m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-[460px] overflow-y-auto rounded-[28px] border-0 bg-paper p-6 text-ink shadow-xl backdrop:bg-ink/35 sm:p-8">
      <BackButton onClick={close} aria-label="Back to stay help"/>
      {open && <KipperCharacter/>}
      <p className="mt-3 text-center text-sm text-moss">Hi, I’m Kipper.</p>
      <h2 id="kipper-welcome-title" ref={heading} tabIndex={-1} className="mt-3 text-center font-display text-[29px] font-normal leading-tight focus:outline-none">What would you like to know about your stay?</h2>
      <p id="kipper-welcome-status" className="mt-4 text-center text-xs leading-6 text-moss">Your AI concierge is in development. For now, explore the stay guide or email the team directly.</p>
      <button type="button" onClick={browseAnswers} className="mt-6 flex min-h-12 w-full items-center justify-center rounded-full bg-ink px-5 text-sm font-medium text-paper focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4">Explore stay answers</button>
      <a href="mailto:vizushu@gmail.com" className="mt-2 flex min-h-12 items-center justify-center text-sm underline underline-offset-4">Email the team</a>
      <button type="button" onClick={() => { close(); const target = document.getElementById("urgent-help"); target?.setAttribute("tabindex", "-1"); target?.focus({preventScroll: true}); target?.scrollIntoView({block:"start"}); }} className="mx-auto mt-1 block min-h-11 text-xs text-moss underline underline-offset-4">Already booked and need urgent help?</button>
    </dialog>
  </>;
}
