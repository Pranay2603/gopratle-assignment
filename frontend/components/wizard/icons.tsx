import type { Category } from "@/lib/options";

/** Simple line icons for the three categories (drawn for this project). */
export function CategoryIcon({ category, size = 28 }: { category: Category; size?: number }) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 28 28",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.6,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
  if (category === "planner") {
    // clipboard with a checklist
    return (
      <svg {...common}>
        <rect x="6" y="5" width="16" height="20" rx="2.5" />
        <path d="M10.5 5V3.8c0-.4.4-.8.8-.8h5.4c.4 0 .8.4.8.8V5" />
        <path d="m10 12 1.5 1.5L14 11M16 12.5h2.5M10 18l1.5 1.5L14 17M16 18.5h2.5" />
      </svg>
    );
  }
  if (category === "performer") {
    // microphone with a star burst
    return (
      <svg {...common}>
        <rect x="8" y="4" width="7" height="12" rx="3.5" />
        <path d="M5.5 12.5a6 6 0 0 0 12 0M11.5 18.5V24M8 24h7" />
        <path d="M21.5 5v3M20 6.5h3M23.5 11.5v2M22.5 12.5h2" />
      </svg>
    );
  }
  // crew: camera + headset arc
  return (
    <svg {...common}>
      <path d="M4 11.5c0-1.1.9-2 2-2h2.5l1.5-2.5h6l1.5 2.5H20c1.1 0 2 .9 2 2V21c0 1.1-.9 2-2 2H6c-1.1 0-2-.9-2-2z" />
      <circle cx="13" cy="16" r="3.6" />
      <path d="M22 5.5c1.6.6 2.5 1.8 2.5 3.5" />
    </svg>
  );
}
