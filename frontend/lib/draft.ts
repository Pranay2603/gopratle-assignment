import { emptyValues, type FormValues } from "./schemas";

/*
 * Draft persistence: answers survive a refresh or an accidental tab close.
 * localStorage can be unavailable (private mode, blocked storage), so every
 * access is wrapped and the form works without it.
 */

const KEY = "gopratle:post-requirement:v1";

export type Draft = {
  values: FormValues;
  step: number;
  furthest: number;
  clientRequestId: string;
  savedAt: number;
};

export function loadDraft(): Draft | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const d = JSON.parse(raw) as Partial<Draft>;
    if (!d?.values?.basics || typeof d.clientRequestId !== "string") return null;
    return {
      values: mergeDeep(emptyValues(), d.values) as FormValues,
      step: clampStep(d.step),
      furthest: clampStep(d.furthest),
      clientRequestId: d.clientRequestId,
      savedAt: d.savedAt ?? Date.now(),
    };
  } catch {
    return null;
  }
}

export function saveDraft(draft: Draft) {
  try {
    localStorage.setItem(KEY, JSON.stringify(draft));
  } catch {
    /* storage full or blocked: the form still works, it just won't survive a reload */
  }
}

export function clearDraft() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

/** True if the user has typed anything worth keeping. */
export function hasContent(v: FormValues) {
  const b = v.basics;
  return Boolean(b.eventName || b.eventType || b.startDate || b.city || b.venue || b.category);
}

const clampStep = (n: unknown) => (typeof n === "number" && n >= 0 && n <= 3 ? Math.floor(n) : 0);

// Fill in keys added since the draft was saved, keep the user's answers.
// JSON turns NaN (an empty number input) into null; treat that as empty.
function mergeDeep(base: unknown, saved: unknown): unknown {
  if (Array.isArray(base)) return Array.isArray(saved) ? saved.map((x) => (x === null ? undefined : x)) : base;
  if (base && typeof base === "object") {
    const out: Record<string, unknown> = { ...(base as object) };
    if (saved && typeof saved === "object") {
      for (const [k, v] of Object.entries(saved)) {
        out[k] = k in out ? mergeDeep(out[k], v) : v;
      }
    }
    return out;
  }
  return saved === null ? undefined : (saved ?? base);
}
