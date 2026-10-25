import { z } from "zod";
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
  valuesOf,
  type Category,
} from "./options";

/*
 * Form-side validation. These schemas mirror the API's rules so users get
 * instant feedback, but the API re-validates everything: the client is a
 * convenience, the server is the authority.
 *
 * The form is shaped around the wizard: each category has two groups, one
 * per step, so "validate step 2" is just "validate planner.scope".
 */

/** Today's date in the user's own timezone, as YYYY-MM-DD. */
export const todayLocal = () => {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
};

const pick = <V extends string>(list: Parameters<typeof valuesOf<V>>[0], message: string) =>
  z.enum(valuesOf(list), { error: message });

/** Number inputs registered with valueAsNumber give NaN when empty. */
const whole = (message: string) => z.number({ error: message }).int("Use a whole number");

const budget = z
  .object({
    min: whole("Enter a minimum budget").min(0, "Budget cannot be negative"),
    max: whole("Enter a maximum budget").positive("Enter a maximum budget"),
  })
  .refine((b) => b.max >= b.min, { message: "Maximum must be at least the minimum", path: ["max"] });

const optionalText = (max: number) => z.string().trim().max(max, `Keep this under ${max} characters`).optional();

// ---------- Step 1 ----------

export const basicsSchema = z
  .object({
    eventName: z
      .string()
      .trim()
      .min(3, "Give the event a name (at least 3 characters)")
      .max(120, "Keep the name under 120 characters"),
    eventType: pick(EVENT_TYPES, "Choose the type of event"),
    dateMode: z.enum(["single", "range"]),
    startDate: z.string().min(1, "Pick a date"),
    endDate: z.string().optional(),
    city: z.string().trim().min(2, "Enter the city").max(80),
    venue: optionalText(160),
    category: pick(CATEGORIES, "Choose who you're looking for"),
  })
  .superRefine((b, ctx) => {
    if (b.startDate && b.startDate < todayLocal()) {
      ctx.addIssue({ code: "custom", path: ["startDate"], message: "Pick today or a later date" });
    }
    if (b.dateMode === "range") {
      if (!b.endDate) {
        ctx.addIssue({ code: "custom", path: ["endDate"], message: "Pick an end date" });
      } else if (b.endDate <= b.startDate) {
        ctx.addIssue({ code: "custom", path: ["endDate"], message: "End date must be after the start date" });
      } else if ((Date.parse(b.endDate) - Date.parse(b.startDate)) / 86_400_000 > 30) {
        ctx.addIssue({ code: "custom", path: ["endDate"], message: "Events can span at most 30 days" });
      }
    }
  });

// ---------- Planner: steps 2 & 3 ----------

export const plannerSchema = z.object({
  scope: z.object({
    planningScope: pick(PLANNING_SCOPES, "Choose how much help you need"),
    guestCount: whole("Enter an approximate guest count").min(1, "At least 1 guest").max(100_000),
    services: z.array(z.enum(valuesOf(PLANNER_SERVICES))).min(1, "Pick at least one service"),
  }),
  preferences: z.object({ budget, theme: optionalText(120), notes: optionalText(1000) }),
});

// ---------- Performer: steps 2 & 3 ----------

export const performerSchema = z.object({
  act: z
    .object({
      performerType: pick(PERFORMER_TYPES, "Choose the kind of performer"),
      genres: z.array(z.enum(valuesOf(GENRES))),
      languages: z.array(z.enum(valuesOf(LANGUAGES))).min(1, "Pick at least one language"),
    })
    .superRefine((a, ctx) => {
      if (isMusicAct(a.performerType) && a.genres.length === 0) {
        ctx.addIssue({ code: "custom", path: ["genres"], message: "Pick at least one genre" });
      }
    }),
  performance: z.object({
    durationMins: whole("Enter how long they should perform").min(15, "At least 15 minutes").max(720, "At most 12 hours"),
    audienceSize: whole("Enter the expected audience size").min(1).max(100_000),
    setting: pick(SETTINGS, "Indoors or outdoors?"),
    soundSystemAvailable: z.boolean({ error: "Let performers know if sound is provided" }),
    budget,
    notes: optionalText(1000),
  }),
});

// ---------- Crew: steps 2 & 3 ----------

export const crewSchema = z.object({
  roles: z.object({
    roles: z
      .array(
        z.object({
          role: pick(CREW_ROLES, "Choose a role"),
          count: whole("How many?").min(1, "At least 1").max(200, "At most 200"),
        }),
      )
      .min(1, "Add at least one role")
      .superRefine((rows, ctx) => {
        const seen = new Set<string>();
        rows.forEach((r, i) => {
          if (r.role && seen.has(r.role)) {
            ctx.addIssue({ code: "custom", path: [i, "role"], message: "Already added above" });
          }
          seen.add(r.role);
        });
      }),
  }),
  shift: z.object({
    callTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Pick a call time"),
    hoursPerDay: z.number({ error: "Enter hours per day" }).min(1, "At least 1 hour").max(24, "At most 24 hours"),
    crewBringsEquipment: z.boolean({ error: "Let the crew know about equipment" }),
    budget,
    notes: optionalText(1000),
  }),
});

// ---------- Form shape ----------

export type Basics = z.input<typeof basicsSchema>;
export type PlannerForm = z.input<typeof plannerSchema>;
export type PerformerForm = z.input<typeof performerSchema>;
export type CrewForm = z.input<typeof crewSchema>;

/** Loose form values: fields start empty, schemas decide when they're complete. */
export type FormValues = {
  basics: Omit<Basics, "eventType" | "category"> & { eventType: string; category: Category | "" };
  planner: DeepPartialLeaves<PlannerForm>;
  performer: DeepPartialLeaves<PerformerForm>;
  crew: DeepPartialLeaves<CrewForm>;
};

// Leaves may be empty while the user is typing (e.g. a select not picked yet).
type DeepPartialLeaves<T> = T extends (infer U)[]
  ? DeepPartialLeaves<U>[]
  : T extends object
    ? { [K in keyof T]: DeepPartialLeaves<T[K]> }
    : T | "" | undefined;

export const categorySchemas = {
  planner: plannerSchema,
  performer: performerSchema,
  crew: crewSchema,
} as const;

/** Schema for the whole form given the chosen category. Other categories' answers are ignored. */
export const schemaFor = (category: Category | "") =>
  category
    ? z.object({ basics: basicsSchema, [category]: categorySchemas[category] })
    : z.object({ basics: basicsSchema });

// ---------- Steps ----------

/** Which form group each wizard step validates, per category. */
export const STEP_GROUPS = {
  planner: ["scope", "preferences"],
  performer: ["act", "performance"],
  crew: ["roles", "shift"],
} as const satisfies Record<Category, readonly [string, string]>;

export const STEP_TITLES: Record<Category | "none", [string, string]> = {
  planner: ["Planning scope", "Budget and style"],
  performer: ["The act", "Performance details"],
  crew: ["Crew roles", "Shift and budget"],
  none: ["Category details", "Preferences"],
};

export const stepTitles = (category: Category | "") => {
  const [two, three] = STEP_TITLES[category || "none"];
  return ["Event basics", two, three, "Review and post"];
};

/** Field path that a given step validates. Step indexes are 0-based. */
export const stepPath = (step: number, category: Category | ""): string | null => {
  if (step === 0) return "basics";
  if (!category || step > 2) return null;
  return `${category}.${STEP_GROUPS[category][step - 1]}`;
};

export const emptyValues = (): FormValues => ({
  basics: {
    eventName: "",
    eventType: "",
    dateMode: "single",
    startDate: "",
    endDate: "",
    city: "",
    venue: "",
    category: "",
  },
  planner: {
    scope: { planningScope: "", guestCount: undefined, services: [] },
    preferences: { budget: { min: undefined, max: undefined }, theme: "", notes: "" },
  },
  performer: {
    act: { performerType: "", genres: [], languages: [] },
    performance: {
      durationMins: undefined,
      audienceSize: undefined,
      setting: "",
      soundSystemAvailable: undefined,
      budget: { min: undefined, max: undefined },
      notes: "",
    },
  },
  crew: {
    roles: { roles: [{ role: "", count: 1 }] },
    shift: {
      callTime: "",
      hoursPerDay: undefined,
      crewBringsEquipment: undefined,
      budget: { min: undefined, max: undefined },
      notes: "",
    },
  },
});
