/**
 * Inline SVG icon set (no emoji icons). Stroke-based, 24×24 viewBox,
 * currentColor — inherits text color from context.
 */
import type { SVGProps } from "react";

type P = SVGProps<SVGSVGElement>;

function base(props: P) {
  return {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
    ...props,
  };
}

export const IconSearch = (p: P) => (
  <svg {...base(p)}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </svg>
);
export const IconCalendar = (p: P) => (
  <svg {...base(p)}>
    <rect x="3" y="5" width="18" height="16" rx="2" />
    <path d="M8 3v4M16 3v4M3 10h18" />
  </svg>
);
export const IconUsers = (p: P) => (
  <svg {...base(p)}>
    <circle cx="9" cy="8" r="3.5" />
    <path d="M2.5 20c.8-3.2 3.4-5 6.5-5s5.7 1.8 6.5 5" />
    <circle cx="17" cy="9" r="2.6" />
    <path d="M16 15.2c2.6.3 4.7 1.9 5.5 4.8" />
  </svg>
);
export const IconBed = (p: P) => (
  <svg {...base(p)}>
    <path d="M3 18v-7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v7" />
    <path d="M3 18h18M3 18v2M21 18v2M5 9V6a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v3" />
  </svg>
);
export const IconBath = (p: P) => (
  <svg {...base(p)}>
    <path d="M4 12h16v2a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5v-2Z" />
    <path d="M6 12V5a2 2 0 0 1 4 0M8 19l-1 2M16 19l1 2" />
  </svg>
);
export const IconPin = (p: P) => (
  <svg {...base(p)}>
    <path d="M12 21s-7-5.6-7-11a7 7 0 0 1 14 0c0 5.4-7 11-7 11Z" />
    <circle cx="12" cy="10" r="2.6" />
  </svg>
);
export const IconCheck = (p: P) => (
  <svg {...base(p)}>
    <path d="m4.5 12.5 5 5 10-11" />
  </svg>
);
export const IconX = (p: P) => (
  <svg {...base(p)}>
    <path d="M6 6l12 12M18 6 6 18" />
  </svg>
);
export const IconChevronLeft = (p: P) => (
  <svg {...base(p)}>
    <path d="m14.5 5.5-7 6.5 7 6.5" />
  </svg>
);
export const IconChevronRight = (p: P) => (
  <svg {...base(p)}>
    <path d="m9.5 5.5 7 6.5-7 6.5" />
  </svg>
);
export const IconChevronDown = (p: P) => (
  <svg {...base(p)}>
    <path d="m5.5 9.5 6.5 7 6.5-7" />
  </svg>
);
export const IconArrowRight = (p: P) => (
  <svg {...base({ strokeWidth: 1.5, ...p })}>
    <path d="M4 12h16m-6-6 6 6-6 6" />
  </svg>
);
export const IconShield = (p: P) => (
  <svg {...base(p)}>
    <path d="M12 3 5 6v5c0 4.5 3 8.5 7 10 4-1.5 7-5.5 7-10V6l-7-3Z" />
    <path d="m9 12 2.2 2.2L15.5 10" />
  </svg>
);
export const IconLock = (p: P) => (
  <svg {...base(p)}>
    <rect x="5" y="11" width="14" height="9" rx="2" />
    <path d="M8 11V8a4 4 0 0 1 8 0v3" />
  </svg>
);
export const IconPet = (p: P) => (
  <svg {...base(p)}>
    <circle cx="8.5" cy="9.5" r="1.6" />
    <circle cx="15.5" cy="9.5" r="1.6" />
    <circle cx="6.5" cy="14.5" r="1.6" />
    <circle cx="17.5" cy="14.5" r="1.6" />
    <path d="M12 11.5c-2 0-3.8 1.8-3.8 3.7 0 1.6 1.3 2.8 3 2.8h1.6c1.7 0 3-1.2 3-2.8 0-1.9-1.8-3.7-3.8-3.7Z" />
  </svg>
);
export const IconPool = (p: P) => (
  <svg {...base(p)}>
    <path d="M2 16c1.7 0 1.7 1.2 3.3 1.2S7 16 8.7 16s1.6 1.2 3.3 1.2S13.7 16 15.3 16s1.7 1.2 3.4 1.2S20.3 16 22 16" />
    <path d="M2 20c1.7 0 1.7 1.2 3.3 1.2S7 20 8.7 20s1.6 1.2 3.3 1.2S13.7 20 15.3 20s1.7 1.2 3.4 1.2S20.3 20 22 20" />
    <path d="M7 13V6a2 2 0 0 1 4 0" />
    <path d="M9 13V4" />
  </svg>
);
export const IconWifi = (p: P) => (
  <svg {...base(p)}>
    <path d="M2.5 9a15 15 0 0 1 19 0M5.5 12.5a10 10 0 0 1 13 0M8.6 16a5 5 0 0 1 6.8 0" />
    <circle cx="12" cy="19" r="1" fill="currentColor" stroke="none" />
  </svg>
);
export const IconCar = (p: P) => (
  <svg {...base(p)}>
    <path d="M5 16 6.5 9.5A2 2 0 0 1 8.5 8h7a2 2 0 0 1 2 1.5L19 16" />
    <rect x="4" y="13" width="16" height="5" rx="1.5" />
    <circle cx="8" cy="18" r="1.4" />
    <circle cx="16" cy="18" r="1.4" />
  </svg>
);
export const IconSparkle = (p: P) => (
  <svg {...base(p)}>
    <path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M18 6l-2.5 2.5M8.5 15.5 6 18" />
  </svg>
);
export const IconClock = (p: P) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7.5V12l3 2" />
  </svg>
);
export const IconMoon = (p: P) => (
  <svg {...base(p)}>
    <path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5Z" />
  </svg>
);
export const IconSun = (p: P) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2.5V5M12 19v2.5M2.5 12H5M19 12h2.5M5 5l1.8 1.8M17.2 17.2 19 19M19 5l-1.8 1.8M6.8 17.2 5 19" />
  </svg>
);
export const IconMessage = (p: P) => (
  <svg {...base(p)}>
    <path d="M4 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H9l-5 4V6Z" />
  </svg>
);
export const IconKey = (p: P) => (
  <svg {...base(p)}>
    <circle cx="8" cy="14" r="4.5" />
    <path d="m11.5 10.5 8-8M17 4l2.5 2.5M14.5 6.5 17 9" />
  </svg>
);
export const IconExpand = (p: P) => (
  <svg {...base(p)}>
    <path d="M9 4H4v5M15 4h5v5M9 20H4v-5M15 20h5v-5" />
  </svg>
);
export const IconMinus = (p: P) => (
  <svg {...base(p)}>
    <path d="M5 12h14" />
  </svg>
);
export const IconMenu = (p: P) => (
  <svg {...base(p)}>
    <path d="M4 7h16M4 12h16M4 17h16" />
  </svg>
);
export const IconPlus = (p: P) => (
  <svg {...base(p)}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);
export const IconCard = (p: P) => (
  <svg {...base(p)}>
    <rect x="3" y="5.5" width="18" height="13" rx="2" />
    <path d="M3 10h18M7 15h4" />
  </svg>
);
export const IconAlert = (p: P) => (
  <svg {...base(p)}>
    <path d="M12 4 3 19h18L12 4Z" />
    <path d="M12 10v4M12 17.5v.5" />
  </svg>
);
export const IconFlame = (p: P) => (
  <svg {...base(p)}>
    <path d="M12 3s5.5 4.5 5.5 9.5a5.5 5.5 0 0 1-11 0c0-2 1-3.7 2.3-5 .4 1.2 1 2 2 2.6C10.6 8 11 5 12 3Z" />
  </svg>
);

export const IconArrowUpRight = (p: P) => (
  <svg {...base({ strokeWidth: 1.5, ...p })}><path d="M6 18 18 6M6 6h12v12" /></svg>
);

export const IconArrowLeft = (p: P) => (
  <svg {...base({ strokeWidth: 1.5, ...p })}><path d="M20 12H4m6-6-6 6 6 6" /></svg>
);
