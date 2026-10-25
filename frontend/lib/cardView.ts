import type { Requirement } from "./api";
import {
  CATEGORIES,
  CREW_ROLES,
  EVENT_TYPES,
  GENRES,
  LANGUAGES,
  PERFORMER_TYPES,
  PLANNER_SERVICES,
  PLANNING_SCOPES,
  isMusicAct,
  labelOf,
  type Category,
} from "./options";
import { formatBudget, formatDates, formatDuration } from "./format";
import type { FormValues } from "./schemas";

/*
 * What a requirement card shows, independent of where the data came from.
 * The same card renders a saved requirement (list, success screen) and the
 * half-filled form (live preview), so "what you see while posting" is exactly
 * "what professionals will see". Empty values (null) render as placeholders.
 */
export type CardView = {
  category: Category | null;
  kicker: string | null; // "Crew for a wedding"
  title: string | null;
  when: string | null;
  where: string | null;
  summary: string | null; // one sentence about what's needed
  tags: string[];
  budget: string | null;
};

const num = (n: unknown) => (typeof n === "number" && Number.isFinite(n) && n > 0 ? n : null);
const text = (s: unknown) => (typeof s === "string" && s.trim() ? s.trim() : null);
const plural = (word: string, n: number) => (n === 1 ? word : `${word}s`);

function kicker(category?: string | null, eventType?: string | null) {
  if (!category) return null;
  const who = labelOf(CATEGORIES, category);
  return eventType ? `${who} for ${articleFor(labelOf(EVENT_TYPES, eventType).toLowerCase())}` : who;
}
const articleFor = (w: string) => (/^[aeiou]/.test(w) ? `an ${w}` : `a ${w}`);

// ---------- one-sentence summaries, tolerant of missing pieces ----------

function plannerSummary(d: { planningScope?: unknown; guestCount?: unknown; theme?: unknown }) {
  const scope = text(d.planningScope) ? labelOf(PLANNING_SCOPES, d.planningScope as string) : null;
  const guests = num(d.guestCount);
  if (!scope && !guests) return null;
  const parts = [scope ?? "Planning", guests ? `for about ${guests.toLocaleString("en-IN")} guests` : null].filter(Boolean);
  const theme = text(d.theme);
  return `${parts.join(" ")}${theme ? `, ${theme} theme` : ""}.`;
}

function performerSummary(d: { performerType?: unknown; durationMins?: unknown; setting?: unknown; audienceSize?: unknown }) {
  const who = text(d.performerType) ? labelOf(PERFORMER_TYPES, d.performerType as string) : null;
  if (!who) return null;
  const mins = num(d.durationMins);
  const audience = num(d.audienceSize);
  const bits = [
    mins ? `for ${formatDuration(mins)}` : null,
    d.setting === "outdoor" ? "outdoors" : d.setting === "indoor" ? "indoors" : null,
    audience ? `audience of ${audience.toLocaleString("en-IN")}` : null,
  ].filter(Boolean);
  return `${who}${bits.length ? ` ${bits.join(", ")}` : ""}.`;
}

function crewSummary(roles: { role?: unknown; count?: unknown }[], hoursPerDay?: unknown) {
  const filled = roles.filter((r) => text(r.role));
  if (!filled.length) return null;
  const list = filled
    .map((r) => {
      const n = num(r.count) ?? 1;
      return `${n} ${plural(labelOf(CREW_ROLES, r.role as string).toLowerCase(), n)}`;
    })
    .join(", ");
  const hours = num(hoursPerDay);
  return `${list}${hours ? `, ${hours} ${plural("hour", hours)} a day` : ""}.`;
}

// ---------- from a saved requirement ----------

export function fromRequirement(r: Requirement): CardView {
  const base = {
    category: r.category,
    kicker: kicker(r.category, r.eventType),
    title: r.eventName,
    when: formatDates(r.startDate, r.endDate, r.dateMode),
    where: r.venue ? `${r.venue}, ${r.city}` : r.city,
    budget: formatBudget(r.details.budget),
  };
  switch (r.category) {
    case "planner":
      return { ...base, summary: plannerSummary(r.details), tags: r.details.services.map((s) => labelOf(PLANNER_SERVICES, s)) };
    case "performer":
      return {
        ...base,
        summary: performerSummary(r.details),
        tags: [...(r.details.genres ?? []).map((g) => labelOf(GENRES, g)), ...r.details.languages.map((l) => labelOf(LANGUAGES, l))],
      };
    case "crew":
      return {
        ...base,
        summary: crewSummary(r.details.roles, r.details.hoursPerDay),
        tags: [r.details.crewBringsEquipment ? "Crew brings equipment" : "Equipment provided"],
      };
  }
}

// ---------- from the form, while it's being filled ----------

export function fromForm(v: FormValues): CardView {
  const b = v.basics;
  const category = (b.category || null) as Category | null;
  const dates = b.startDate ? formatDates(b.startDate, b.dateMode === "range" ? b.endDate : undefined, b.dateMode) : null;
  const city = text(b.city);
  const venue = text(b.venue);
  const view: CardView = {
    category,
    kicker: kicker(category, b.eventType || null),
    title: text(b.eventName),
    when: dates,
    where: city ? (venue ? `${venue}, ${city}` : city) : null,
    summary: null,
    tags: [],
    budget: null,
  };

  if (category === "planner") {
    const s = v.planner.scope;
    const p = v.planner.preferences;
    view.summary = plannerSummary({ ...s, theme: p.theme });
    view.tags = ((s.services ?? []) as string[]).map((x) => labelOf(PLANNER_SERVICES, x));
    view.budget = budgetOrNull(p.budget);
  } else if (category === "performer") {
    const a = v.performer.act;
    const p = v.performer.performance;
    view.summary = performerSummary({ ...a, ...p });
    const genres = isMusicAct(a.performerType as string) ? ((a.genres ?? []) as string[]) : [];
    view.tags = [...genres.map((g) => labelOf(GENRES, g)), ...((a.languages ?? []) as string[]).map((l) => labelOf(LANGUAGES, l))];
    view.budget = budgetOrNull(p.budget);
  } else if (category === "crew") {
    const s = v.crew.shift;
    view.summary = crewSummary((v.crew.roles.roles ?? []) as { role?: unknown; count?: unknown }[], s.hoursPerDay);
    view.tags =
      s.crewBringsEquipment === true ? ["Crew brings equipment"] : s.crewBringsEquipment === false ? ["Equipment provided"] : [];
    view.budget = budgetOrNull(s.budget);
  }
  return view;
}

function budgetOrNull(b: unknown) {
  const budget = b as { min?: unknown; max?: unknown } | undefined;
  const max = num(budget?.max);
  if (!max) return null;
  const min = typeof budget?.min === "number" && Number.isFinite(budget.min) ? budget.min : 0;
  return min > max ? null : formatBudget({ min, max });
}
