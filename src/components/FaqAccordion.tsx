"use client";
/**
 * FaqAccordion — accessible accordion (button + region, aria-expanded).
 */
import { useState } from "react";
import { IconChevronDown } from "@/components/icons";
import { cn } from "@/components/cn";
import type { Faq } from "@/lib/types";

export default function FaqAccordion({ faqs }: { faqs: Faq[] }) {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <div className="divide-y divide-stone-200 rounded-2xl border border-stone-200 bg-white">
      {faqs.map((faq, i) => {
        const isOpen = open === i;
        return (
          <div key={i}>
            <button
              type="button"
              onClick={() => setOpen(isOpen ? null : i)}
              aria-expanded={isOpen}
              aria-controls={`faq-panel-${i}`}
              className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
            >
              <span className="text-[15px] font-medium text-ink">{faq.q}</span>
              <IconChevronDown
                className={cn(
                  "h-5 w-5 shrink-0 text-stone-400 transition-transform",
                  isOpen && "rotate-180",
                )}
              />
            </button>
            <div
              id={`faq-panel-${i}`}
              role="region"
              hidden={!isOpen}
              className="px-5 pb-5"
            >
              <p className="max-w-2xl text-sm leading-relaxed text-stone-600">{faq.a}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
