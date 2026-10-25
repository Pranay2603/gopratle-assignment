import {
  CATEGORIES,
  CREW_ROLES,
  EVENT_TYPES,
  GENRES,
  LANGUAGES,
  PERFORMER_TYPES,
  PLANNER_SERVICES,
  PLANNING_SCOPES,
  SETTINGS,
  isMusicAct,
  labelOf,
  type Option,
} from "./options";
import { formatBudget, formatDates, formatDuration, formatTime } from "./format";
import { stepTitles, type FormValues } from "./schemas";

export type Row = [label: string, value: string];
export type Section = { step: number; title: string; rows: Row[] };

const list = (opts: readonly Option[], values?: (string | undefined)[]) =>
  (values ?? []).filter(Boolean).map((v) => labelOf(opts, v)).join(", ");
const num = (n: unknown, unit: string) => (typeof n === "number" && Number.isFinite(n) ? `${n.toLocaleString("en-IN")} ${unit}` : "");
const yesNo = (b: unknown, yes: string, no: string) => (b === true ? yes : b === false ? no : "");

/** Human-readable answers grouped by wizard step. Empty answers are dropped. */
export function summarize(v: FormValues): Section[] {
  const b = v.basics;
  const titles = stepTitles(b.category);
  const sections: Section[] = [
    {
      step: 0,
      title: titles[0],
      rows: [
        ["Event", b.eventName],
        ["Type", labelOf(EVENT_TYPES, b.eventType)],
        ["Date", formatDates(b.startDate, b.endDate, b.dateMode)],
        ["City", b.city],
        ["Venue", b.venue || ""],
        ["Looking for", labelOf(CATEGORIES, b.category)],
      ],
    },
  ];

  if (b.category === "planner") {
    const s = v.planner.scope;
    const p = v.planner.preferences;
    sections.push(
      {
        step: 1,
        title: titles[1],
        rows: [
          ["Help needed", labelOf(PLANNING_SCOPES, s.planningScope as string)],
          ["Guests", num(s.guestCount, "guests")],
          ["Services", list(PLANNER_SERVICES, s.services as string[])],
        ],
      },
      {
        step: 2,
        title: titles[2],
        rows: [
          ["Budget", formatBudget(p.budget as never)],
          ["Theme", (p.theme as string) || ""],
          ["Notes", (p.notes as string) || ""],
        ],
      },
    );
  }

  if (b.category === "performer") {
    const a = v.performer.act;
    const p = v.performer.performance;
    sections.push(
      {
        step: 1,
        title: titles[1],
        rows: [
          ["Performer", labelOf(PERFORMER_TYPES, a.performerType as string)],
          ["Genres", isMusicAct(a.performerType as string) ? list(GENRES, a.genres as string[]) : ""],
          ["Languages", list(LANGUAGES, a.languages as string[])],
        ],
      },
      {
        step: 2,
        title: titles[2],
        rows: [
          ["Length", formatDuration(p.durationMins as number)],
          ["Audience", num(p.audienceSize, "people")],
          ["Setting", labelOf(SETTINGS, p.setting as string)],
          ["Sound system", yesNo(p.soundSystemAvailable, "Provided at the venue", "Performer brings their own")],
          ["Fee", formatBudget(p.budget as never)],
          ["Notes", (p.notes as string) || ""],
        ],
      },
    );
  }

  if (b.category === "crew") {
    const roles = (v.crew.roles.roles ?? []).filter((r) => r?.role);
    const s = v.crew.shift;
    sections.push(
      {
        step: 1,
        title: titles[1],
        rows: roles.map((r) => [labelOf(CREW_ROLES, r.role as string), num(r.count, r.count === 1 ? "person" : "people")]),
      },
      {
        step: 2,
        title: titles[2],
        rows: [
          ["Call time", formatTime(s.callTime as string)],
          ["Hours per day", num(s.hoursPerDay, "hours")],
          ["Equipment", yesNo(s.crewBringsEquipment, "Crew brings their own", "Provided by you")],
          ["Budget", formatBudget(s.budget as never)],
          ["Notes", (s.notes as string) || ""],
        ],
      },
    );
  }

  return sections.map((s) => ({ ...s, rows: s.rows.filter(([, val]) => val && val.trim()) }));
}
