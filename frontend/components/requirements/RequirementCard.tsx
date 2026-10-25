import type { ReactNode } from "react";
import type { CardView } from "@/lib/cardView";
import { cx } from "@/components/ui/fields";
import { CategoryIcon } from "@/components/wizard/icons";

/** Grey bar standing in for a value that hasn't been filled in yet (live preview only). */
function Slot({ value, width = "w-32", className }: { value: string | null; width?: string; className?: string }) {
  if (value) return <span className={className}>{value}</span>;
  return <span aria-hidden className={cx("inline-block h-[0.7em] rounded-full bg-line align-middle", width)} />;
}

/**
 * How a requirement looks to professionals. Used in three places with the same data shape:
 * the live preview while posting, the success screen, and the posted-requirements list.
 *
 * layout="card": stacked, for narrow columns (preview, success)
 * layout="row":  icon | details | budget, for the list
 */
export function RequirementCard({
  view,
  layout = "card",
  aside,
  as: Tag = "article",
}: {
  view: CardView;
  layout?: "card" | "row";
  aside?: ReactNode; // e.g. "Posted 2 min ago"
  as?: "article" | "li" | "div";
}) {
  const icon = (
    <div
      className={cx(
        "flex size-11 shrink-0 items-center justify-center rounded-full",
        view.category ? "bg-brand-soft text-brand-ink" : "bg-paper text-line-strong",
      )}
    >
      {view.category ? (
        <CategoryIcon category={view.category} size={22} />
      ) : (
        <span className="size-5 rounded-full border-2 border-dashed border-current" />
      )}
    </div>
  );

  const details = (
    <div className="min-w-0">
      <p className="text-sm text-muted">
        <Slot value={view.kicker} width="w-28" />
      </p>
      <h3 className="mt-1 text-xl leading-snug font-bold break-words">
        <Slot value={view.title} width="w-48" />
      </h3>
      <p className="mt-1 text-[15px] text-ink-soft">
        <Slot value={view.when} width="w-24" />
        {(view.when || view.where) && <span className="text-line-strong">{"  /  "}</span>}
        <Slot value={view.where} width="w-16" />
      </p>
      <p className="mt-3 text-[15px] text-ink">
        <Slot value={view.summary} width="w-56" />
      </p>
      {view.tags.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="Details">
          {view.tags.map((t) => (
            <li key={t} className="rounded-full border border-line px-2.5 py-0.5 text-sm text-ink-soft">
              {t}
            </li>
          ))}
        </ul>
      )}
    </div>
  );

  const money = (
    <p className="font-display text-lg font-bold tabular-nums">
      <Slot value={view.budget} width="w-28" />
    </p>
  );

  if (layout === "row") {
    return (
      <Tag className="grid gap-4 border-b border-line p-5 last:border-b-0 sm:grid-cols-[auto_1fr_auto] sm:gap-5 sm:p-6">
        {icon}
        {details}
        <div className="sm:text-right">
          {money}
          {aside && <div className="text-sm text-muted">{aside}</div>}
        </div>
      </Tag>
    );
  }

  return (
    <Tag className="rounded-2xl border border-line bg-surface p-5 shadow-[0_1px_0_0_var(--color-line)]">
      <div className="flex items-start justify-between gap-3">
        {icon}
        {aside && <div className="pt-1 text-right text-sm text-muted">{aside}</div>}
      </div>
      <div className="mt-4">{details}</div>
      <div className="mt-5 border-t border-line pt-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-muted">Budget</p>
          <span className="shrink-0 rounded-full bg-jade-soft px-2.5 py-0.5 text-sm font-medium whitespace-nowrap text-jade">
            Open for proposals
          </span>
        </div>
        <div className="mt-1">{money}</div>
      </div>
    </Tag>
  );
}
