import { categorySchemas, basicsSchema, STEP_GROUPS, type FormValues } from "./schemas";
import { isMusicAct, type Category } from "./options";

/*
 * The form is shaped for the wizard (answers grouped by step); the API is
 * shaped for storage (basics at the top level, category answers in `details`).
 * These two functions translate between them in both directions.
 */

export type RequirementPayload = ReturnType<typeof toPayload>;

/** Build the POST /api/requirements body. Assumes the form already validated. */
export function toPayload(values: FormValues, clientRequestId: string) {
  const basics = basicsSchema.parse(values.basics); // trims strings
  const category = basics.category as Category;

  const groups = categorySchemas[category].parse(values[category]) as Record<string, Record<string, unknown>>;
  const [first, second] = STEP_GROUPS[category];
  const details: Record<string, unknown> = { ...groups[first], ...groups[second] };

  // Don't send fields that don't apply.
  if (category === "performer" && !isMusicAct(details.performerType as string)) delete details.genres;
  for (const key of ["theme", "notes"]) if (!details[key]) delete details[key];

  return {
    clientRequestId,
    category,
    eventName: basics.eventName,
    eventType: basics.eventType,
    dateMode: basics.dateMode,
    startDate: basics.startDate,
    ...(basics.dateMode === "range" ? { endDate: basics.endDate } : {}),
    city: basics.city,
    ...(basics.venue ? { venue: basics.venue } : {}),
    details,
  };
}

/**
 * Map an API error path back to a form field so server-side errors show up
 * next to the right input, e.g. for a planner:
 *   "eventName"          -> "basics.eventName"
 *   "details.budget.max" -> "planner.preferences.budget.max"
 */
export function apiPathToFormPath(apiPath: string, category: Category): string | null {
  const [head, ...rest] = apiPath.split(".");
  if (head !== "details") return head === "clientRequestId" || head === "_root" ? null : `basics.${apiPath}`;

  // Which step group owns this field? Read it off the step-1 group's schema shape.
  const field = rest[0];
  const [first, second] = STEP_GROUPS[category];
  const groups = categorySchemas[category].shape as Record<string, { shape: Record<string, unknown> }>;
  const group = field in groups[first].shape ? first : second;
  return `${category}.${group}.${rest.join(".")}`;
}
