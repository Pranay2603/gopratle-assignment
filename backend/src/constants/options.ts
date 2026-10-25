// Allowed values for enum fields. The API is the source of truth: anything
// outside these lists is rejected even if a client sends it.
// The frontend keeps a matching copy in frontend/lib/options.ts.

export const CATEGORIES = ["planner", "performer", "crew"] as const;
export type Category = (typeof CATEGORIES)[number];

export const EVENT_TYPES = [
  "wedding",
  "engagement",
  "birthday",
  "corporate",
  "conference",
  "concert",
  "festival",
  "private_party",
  "other",
] as const;

export const DATE_MODES = ["single", "range"] as const;

// Planner
export const PLANNING_SCOPES = ["full", "partial", "day_of"] as const;
export const PLANNER_SERVICES = [
  "venue_sourcing",
  "decor",
  "catering",
  "guest_management",
  "vendor_coordination",
  "logistics",
  "entertainment",
  "photography",
] as const;

// Performer
export const PERFORMER_TYPES = [
  "singer",
  "band",
  "dj",
  "instrumentalist",
  "dancer",
  "comedian",
  "anchor",
  "magician",
] as const;
// Genres only make sense for music acts; other performer types skip that field.
export const MUSIC_PERFORMER_TYPES = ["singer", "band", "dj", "instrumentalist"] as const;
export const GENRES = [
  "bollywood",
  "classical",
  "sufi",
  "folk",
  "pop",
  "rock",
  "edm",
  "jazz",
  "hip_hop",
] as const;
export const LANGUAGES = [
  "english",
  "hindi",
  "punjabi",
  "tamil",
  "telugu",
  "bengali",
  "marathi",
  "kannada",
  "malayalam",
  "gujarati",
] as const;
export const SETTINGS = ["indoor", "outdoor"] as const;

// Crew
export const CREW_ROLES = [
  "photographer",
  "videographer",
  "sound_technician",
  "lighting_technician",
  "stage_hand",
  "makeup_artist",
  "decorator",
  "security",
  "hospitality_staff",
] as const;
