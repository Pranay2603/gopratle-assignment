"use client";

import Link from "next/link";
import type { Requirement } from "@/lib/api";
import { CATEGORIES, labelOf } from "@/lib/options";
import { fromRequirement } from "@/lib/cardView";
import { Button } from "@/components/ui/fields";
import { RequirementCard } from "@/components/requirements/RequirementCard";

/** After posting: confirm, and show the live listing exactly as professionals now see it. */
export function SuccessPanel({ requirement, onPostAnother }: { requirement: Requirement; onPostAnother: () => void }) {
  const category = labelOf(CATEGORIES, requirement.category).toLowerCase();
  return (
    <div className="step-in grid gap-10 lg:grid-cols-[minmax(0,1fr)_21.5rem] lg:gap-14" role="status" aria-live="polite">
      <div>
        <div className="flex size-12 items-center justify-center rounded-full bg-jade-soft text-jade">
          <svg width="22" height="18" viewBox="0 0 22 18" aria-hidden>
            <path d="M2 9.5 8 15.5 20 2.5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <h2 className="mt-5 text-3xl font-bold sm:text-4xl">Your requirement is live</h2>
        <p className="mt-3 max-w-[52ch] text-lg text-muted">
          It&apos;s listed under {category} requirements. Professionals in this category can see it now and send you
          proposals.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href={`/requirements?category=${requirement.category}`}
            className="inline-flex items-center rounded-lg bg-brand-strong px-5 py-2.5 text-[15px] font-medium text-white hover:bg-brand-strong-hover"
          >
            See {category} requirements
          </Link>
          <Button variant="secondary" onClick={onPostAnother}>
            Post another requirement
          </Button>
        </div>
        <p className="mt-8 text-sm text-muted">
          Reference <code className="rounded bg-surface px-1.5 py-0.5 text-ink-soft">{requirement.id}</code>
        </p>
      </div>

      <div>
        <p className="mb-3 text-[15px] font-medium text-ink">Your listing</p>
        <RequirementCard view={fromRequirement(requirement)} aside="Posted just now" as="div" />
      </div>
    </div>
  );
}
