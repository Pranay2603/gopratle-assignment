"use client";

import { useWatch } from "react-hook-form";
import type { FormValues } from "@/lib/schemas";
import { summarize } from "@/lib/summary";

/** Step 4: read back every answer, with a way to jump back and change it. */
export function ReviewStep({ onEdit }: { onEdit: (step: number) => void }) {
  const values = useWatch<FormValues>() as FormValues;
  const sections = summarize(values);

  return (
    <div className="grid gap-5">
      <p className="-mt-1 max-w-[60ch] text-muted">
        Check your answers. Once posted, professionals in this category can see your requirement and send proposals.
      </p>
      {sections.map((s) => (
        <section key={s.step} className="rounded-xl border border-line bg-surface">
          <header className="flex items-center justify-between gap-3 border-b border-line px-4 py-3 sm:px-5">
            <h3 className="text-base font-bold">{s.title}</h3>
            <button
              type="button"
              onClick={() => onEdit(s.step)}
              className="rounded-md px-2 py-1 text-sm font-medium text-ink-soft underline underline-offset-4 hover:text-ink"
            >
              Edit<span className="sr-only"> {s.title.toLowerCase()}</span>
            </button>
          </header>
          <dl className="grid gap-x-6 gap-y-2.5 px-4 py-4 sm:grid-cols-[10rem_1fr] sm:px-5">
            {s.rows.map(([label, value]) => (
              <div key={label} className="contents">
                <dt className="text-sm text-muted">{label}</dt>
                <dd className="-mt-2 text-[15px] whitespace-pre-line text-ink sm:mt-0">{value}</dd>
              </div>
            ))}
          </dl>
        </section>
      ))}
    </div>
  );
}
