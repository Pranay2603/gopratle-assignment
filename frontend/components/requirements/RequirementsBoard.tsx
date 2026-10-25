"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { api, ApiError, type Requirement, type Summary } from "@/lib/api";
import { CATEGORIES, labelOf, type Category } from "@/lib/options";
import { fromRequirement } from "@/lib/cardView";
import { Button, cx } from "@/components/ui/fields";
import { RequirementCard } from "./RequirementCard";

const PAGE_SIZE = 10;

const parseCategory = (v: string | null) =>
  CATEGORIES.some((c) => c.value === v) ? (v as Category) : undefined;

/** Reads ?category= from the URL, so it must render inside <Suspense>. */
export function RequirementsBoard() {
  const searchParams = useSearchParams();
  const [category, setCategory] = useState<Category | undefined>(() => parseCategory(searchParams.get("category")));
  const [items, setItems] = useState<Requirement[]>([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error" | "loading-more">("loading");
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);

  // Counts for the tabs
  useEffect(() => {
    const ctrl = new AbortController();
    api
      .summary(ctrl.signal)
      .then((r) => setSummary(r.data))
      .catch(() => {});
    return () => ctrl.abort();
  }, [attempt]);

  // First page whenever the category changes (or on retry).
  // The handlers that change category/attempt also set state to "loading".
  useEffect(() => {
    const ctrl = new AbortController();
    api
      .listRequirements({ category, page: 1, limit: PAGE_SIZE }, ctrl.signal)
      .then((r) => {
        setItems(r.data);
        setPage(1);
        setPages(r.pagination.pages);
        setState("ready");
      })
      .catch((e) => {
        if (ctrl.signal.aborted) return;
        setError(e instanceof ApiError ? e.message : "Couldn't load requirements.");
        setState("error");
      });
    return () => ctrl.abort();
  }, [category, attempt]);

  const loadMore = async () => {
    setState("loading-more");
    try {
      const r = await api.listRequirements({ category, page: page + 1, limit: PAGE_SIZE });
      // Skip anything already shown in case new posts shifted the pages.
      setItems((prev) => [...prev, ...r.data.filter((x) => !prev.some((p) => p.id === x.id))]);
      setPage(page + 1);
      setPages(r.pagination.pages);
      setState("ready");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Couldn't load more.");
      setState("error");
    }
  };

  const retry = () => {
    setState("loading");
    setAttempt((a) => a + 1);
  };

  const selectCategory = useCallback((c?: Category) => {
    setState("loading");
    setCategory(c);
    const url = c ? `/requirements?category=${c}` : "/requirements";
    window.history.replaceState(null, "", url); // keep the tab in the URL without a navigation
  }, []);

  const tabs: { value?: Category; label: string; count?: number }[] = [
    { value: undefined, label: "All", count: summary?.total },
    ...CATEGORIES.map((c) => ({ value: c.value, label: c.label, count: summary?.[c.value] })),
  ];

  return (
    <div>
      <div role="tablist" aria-label="Filter by category" className="mb-6 flex flex-wrap gap-2">
        {tabs.map((t) => {
          const on = t.value === category;
          return (
            <button
              key={t.label}
              role="tab"
              aria-selected={on}
              onClick={() => selectCategory(t.value)}
              className={cx(
                "inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-[15px] transition-colors",
                on ? "border-ink bg-ink text-white" : "border-line bg-surface text-ink-soft hover:border-line-strong",
              )}
            >
              {t.label}
              {typeof t.count === "number" && (
                <span className={cx("text-sm tabular-nums", on ? "text-white/75" : "text-muted")}>{t.count}</span>
              )}
            </button>
          );
        })}
      </div>

      {state === "loading" && <ListSkeleton />}

      {state === "error" && (
        <div role="alert" className="rounded-xl border border-danger/30 bg-danger-soft p-5 text-danger">
          <p className="font-medium">{error}</p>
          <p className="mt-1 text-sm">If the server was asleep it may need a minute to start.</p>
          <Button variant="secondary" className="mt-4" onClick={retry}>
            Try again
          </Button>
        </div>
      )}

      {(state === "ready" || state === "loading-more") && items.length === 0 && (
        <div className="rounded-xl border border-dashed border-line-strong bg-surface p-8 text-center">
          <p className="font-medium text-ink">
            No {category ? labelOf(CATEGORIES, category).toLowerCase() + " " : ""}requirements yet.
          </p>
          <p className="mt-1 text-muted">Post one and it will show up here.</p>
          <Link
            href="/"
            className="mt-5 inline-flex rounded-lg bg-brand-strong px-5 py-2.5 text-[15px] font-medium text-white hover:bg-brand-strong-hover"
          >
            Post a requirement
          </Link>
        </div>
      )}

      {items.length > 0 && state !== "loading" && state !== "error" && (
        <>
          <ul className="overflow-hidden rounded-xl border border-line bg-surface">
            {items.map((r) => (
              <RequirementRow key={r.id} r={r} />
            ))}
          </ul>
          {page < pages && (
            <div className="mt-6 flex justify-center">
              <Button variant="secondary" onClick={loadMore} disabled={state === "loading-more"}>
                {state === "loading-more" ? "Loading…" : "Show more"}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function RequirementRow({ r }: { r: Requirement }) {
  return <RequirementCard as="li" layout="row" view={fromRequirement(r)} aside={`Posted ${timeAgo(r.createdAt)}`} />;
}

function timeAgo(iso: string) {
  const s = Math.max(0, (Date.now() - Date.parse(iso)) / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hr ago`;
  const d = Math.floor(h / 24);
  return d === 1 ? "yesterday" : `${d} days ago`;
}

function ListSkeleton() {
  return (
    <ul className="overflow-hidden rounded-xl border border-line bg-surface" aria-label="Loading requirements">
      {[0, 1, 2].map((i) => (
        <li key={i} className="flex animate-pulse gap-5 border-b border-line p-6 last:border-b-0">
          <div className="size-11 rounded-full bg-paper" />
          <div className="flex-1 space-y-2.5">
            <div className="h-3 w-40 rounded bg-paper" />
            <div className="h-5 w-72 max-w-full rounded bg-paper" />
            <div className="h-3 w-56 rounded bg-paper" />
          </div>
        </li>
      ))}
    </ul>
  );
}
