"use client";

import { cx } from "@/components/ui/fields";

/**
 * Horizontal progress across the four steps. Steps already reached can be
 * clicked to jump back. On phones only the bar and "Step 2 of 4" show; the
 * current step's title is the heading right below.
 */
export function Stepper({
  titles,
  step,
  furthest,
  onJump,
}: {
  titles: string[];
  step: number;
  furthest: number;
  onJump: (i: number) => void;
}) {
  return (
    <nav aria-label="Form steps">
      <p className="mb-2 text-sm text-muted sm:hidden">
        Step {step + 1} of {titles.length}
      </p>
      <ol className="grid grid-cols-4 gap-2">
        {titles.map((title, i) => {
          const current = i === step;
          const reachable = i <= furthest && !current;
          const done = i < step || (i <= furthest && !current);
          return (
            <li key={title + i}>
              <button
                type="button"
                onClick={() => onJump(i)}
                disabled={!reachable}
                aria-current={current ? "step" : undefined}
                className="group block w-full text-left disabled:cursor-default"
              >
                <span
                  aria-hidden
                  className={cx(
                    "block h-1.5 rounded-full transition-colors",
                    current || done ? "bg-brand" : "bg-line",
                    reachable && "group-hover:bg-brand-strong",
                  )}
                />
                <span
                  className={cx(
                    "mt-2.5 hidden text-sm sm:block",
                    current ? "font-semibold text-ink" : done ? "text-ink-soft group-hover:text-ink" : "text-muted",
                  )}
                >
                  <span className={cx("mr-1.5 tabular-nums", current || done ? "text-brand-ink" : "")}>{i + 1}</span>
                  {title}
                </span>
                <span className="sr-only sm:hidden">{title}</span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
