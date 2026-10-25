"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cx } from "@/components/ui/fields";

// Short labels on phones keep the header on one line.
const LINKS = [
  { href: "/", label: "Post a requirement", short: "Post" },
  { href: "/requirements", label: "Posted requirements", short: "Posted" },
];

export function SiteHeader() {
  const pathname = usePathname();
  return (
    <header className="border-b border-line bg-surface">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link href="/" className="flex items-center gap-2 font-display text-xl font-bold tracking-tight text-ink">
          {/* Simple mark in GoPratle's orange: a burst, for the moment an event comes together */}
          <svg width="26" height="26" viewBox="0 0 26 26" aria-hidden>
            <rect width="26" height="26" rx="7" fill="#FF4C18" />
            <path
              d="M13 5.5c.5 3.6 1.9 5 5.5 5.5-3.6.5-5 1.9-5.5 5.5-.5-3.6-1.9-5-5.5-5.5 3.6-.5 5-1.9 5.5-5.5Z"
              fill="#fff"
            />
            <circle cx="19" cy="18.5" r="1.6" fill="#fff" />
          </svg>
          GoPratle
        </Link>
        <nav aria-label="Main">
          <ul className="flex gap-1 text-[15px]">
            {LINKS.map((l) => {
              const active = l.href === "/" ? pathname === "/" : pathname.startsWith(l.href);
              return (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    aria-current={active ? "page" : undefined}
                    className={cx(
                      "block rounded-md px-3 py-1.5 whitespace-nowrap transition-colors",
                      active ? "bg-brand-soft font-medium text-brand-ink" : "text-muted hover:text-ink",
                    )}
                  >
                    <span className="sm:hidden">{l.short}</span>
                    <span className="hidden sm:inline">{l.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </header>
  );
}
