import type { Category } from "./options";
import type { RequirementPayload } from "./payload";

export const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000").replace(/\/$/, "");

/** Every API failure, normalised. `kind` tells the UI what to say. */
export class ApiError extends Error {
  constructor(
    public kind: "validation" | "network" | "timeout" | "rate_limited" | "not_found" | "server",
    message: string,
    public fields?: Record<string, string>,
  ) {
    super(message);
  }
}

async function request<T>(path: string, init: RequestInit = {}, timeoutMs = 45_000): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", ...init.headers },
      signal: init.signal ?? controller.signal,
    });
  } catch (err) {
    if ((err as Error).name === "AbortError") {
      throw new ApiError("timeout", "The server took too long to respond. Try again.");
    }
    throw new ApiError("network", "Couldn't reach the server. Check your connection and try again.");
  } finally {
    clearTimeout(timer);
  }

  const body = await res.json().catch(() => null);
  if (res.ok) return body as T;

  const message: string = body?.error?.message ?? `Request failed (${res.status})`;
  if (res.status === 400) throw new ApiError("validation", message, body?.error?.fields);
  if (res.status === 404) throw new ApiError("not_found", message);
  if (res.status === 429) throw new ApiError("rate_limited", message);
  throw new ApiError("server", message);
}

// ---------- types (mirror the API's JSON) ----------

export type Budget = { min: number; max: number };

type Base = {
  id: string;
  eventName: string;
  eventType: string;
  dateMode: "single" | "range";
  startDate: string;
  endDate?: string;
  city: string;
  venue?: string;
  status: "open" | "closed";
  createdAt: string;
};

export type PlannerRequirement = Base & {
  category: "planner";
  details: { planningScope: string; guestCount: number; services: string[]; budget: Budget; theme?: string; notes?: string };
};
export type PerformerRequirement = Base & {
  category: "performer";
  details: {
    performerType: string;
    genres?: string[];
    languages: string[];
    durationMins: number;
    audienceSize: number;
    setting: string;
    soundSystemAvailable: boolean;
    budget: Budget;
    notes?: string;
  };
};
export type CrewRequirement = Base & {
  category: "crew";
  details: {
    roles: { role: string; count: number }[];
    callTime: string;
    hoursPerDay: number;
    crewBringsEquipment: boolean;
    budget: Budget;
    notes?: string;
  };
};
export type Requirement = PlannerRequirement | PerformerRequirement | CrewRequirement;

export type Paginated<T> = { data: T[]; pagination: { page: number; limit: number; total: number; pages: number } };
export type Summary = Record<Category | "total", number>;

// ---------- endpoints ----------

export const api = {
  createRequirement: (payload: RequirementPayload) =>
    request<{ data: Requirement; duplicate?: boolean }>("/api/requirements", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  listRequirements: (params: { category?: Category; page?: number; limit?: number } = {}, signal?: AbortSignal) => {
    const qs = new URLSearchParams();
    if (params.category) qs.set("category", params.category);
    qs.set("page", String(params.page ?? 1));
    qs.set("limit", String(params.limit ?? 12));
    return request<Paginated<Requirement>>(`/api/requirements?${qs}`, { signal });
  },

  summary: (signal?: AbortSignal) => request<{ data: Summary }>("/api/requirements/summary", { signal }),
};
