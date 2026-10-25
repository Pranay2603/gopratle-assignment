// Option lists for every select / chip field, with human labels.
// Values must match backend/src/constants/options.ts (the API rejects anything else).

export type Option<V extends string = string> = { value: V; label: string; hint?: string };

const opts = <const V extends string>(list: readonly Option<V>[]) => list;
export const valuesOf = <V extends string>(list: readonly Option<V>[]) =>
  list.map((o) => o.value) as [V, ...V[]];
export const labelOf = (list: readonly Option[], value?: string | null) =>
  list.find((o) => o.value === value)?.label ?? value ?? "";

export const CATEGORIES = opts([
  {
    value: "planner",
    label: "Event planner",
    hint: "Someone to plan and run the event, from venue and decor to vendors on the day.",
  },
  {
    value: "performer",
    label: "Performer",
    hint: "A singer, band, DJ, dancer, comedian or anchor to perform at the event.",
  },
  {
    value: "crew",
    label: "Crew",
    hint: "Photographers, technicians, stage hands and other people to staff the event.",
  },
]);
export type Category = (typeof CATEGORIES)[number]["value"];

export const EVENT_TYPES = opts([
  { value: "wedding", label: "Wedding" },
  { value: "engagement", label: "Engagement" },
  { value: "birthday", label: "Birthday" },
  { value: "corporate", label: "Corporate event" },
  { value: "conference", label: "Conference" },
  { value: "concert", label: "Concert" },
  { value: "festival", label: "Festival" },
  { value: "private_party", label: "Private party" },
  { value: "other", label: "Something else" },
]);

export const PLANNING_SCOPES = opts([
  { value: "full", label: "Full planning", hint: "From concept to the last guest leaving" },
  { value: "partial", label: "Partial planning", hint: "You have some vendors; fill the gaps" },
  { value: "day_of", label: "Day-of coordination", hint: "You've planned it; they run the day" },
]);

export const PLANNER_SERVICES = opts([
  { value: "venue_sourcing", label: "Venue sourcing" },
  { value: "decor", label: "Decor" },
  { value: "catering", label: "Catering" },
  { value: "guest_management", label: "Guest management" },
  { value: "vendor_coordination", label: "Vendor coordination" },
  { value: "logistics", label: "Travel & logistics" },
  { value: "entertainment", label: "Entertainment" },
  { value: "photography", label: "Photography" },
]);

export const PERFORMER_TYPES = opts([
  { value: "singer", label: "Singer" },
  { value: "band", label: "Live band" },
  { value: "dj", label: "DJ" },
  { value: "instrumentalist", label: "Instrumentalist" },
  { value: "dancer", label: "Dancer / troupe" },
  { value: "comedian", label: "Stand-up comedian" },
  { value: "anchor", label: "Anchor / emcee" },
  { value: "magician", label: "Magician" },
]);
export const MUSIC_PERFORMER_TYPES = ["singer", "band", "dj", "instrumentalist"] as const;
export const isMusicAct = (t?: string) => (MUSIC_PERFORMER_TYPES as readonly string[]).includes(t ?? "");

export const GENRES = opts([
  { value: "bollywood", label: "Bollywood" },
  { value: "classical", label: "Classical" },
  { value: "sufi", label: "Sufi" },
  { value: "folk", label: "Folk" },
  { value: "pop", label: "Pop" },
  { value: "rock", label: "Rock" },
  { value: "edm", label: "EDM" },
  { value: "jazz", label: "Jazz" },
  { value: "hip_hop", label: "Hip-hop" },
]);

export const LANGUAGES = opts([
  { value: "english", label: "English" },
  { value: "hindi", label: "Hindi" },
  { value: "punjabi", label: "Punjabi" },
  { value: "tamil", label: "Tamil" },
  { value: "telugu", label: "Telugu" },
  { value: "bengali", label: "Bengali" },
  { value: "marathi", label: "Marathi" },
  { value: "kannada", label: "Kannada" },
  { value: "malayalam", label: "Malayalam" },
  { value: "gujarati", label: "Gujarati" },
]);

export const SETTINGS = opts([
  { value: "indoor", label: "Indoors" },
  { value: "outdoor", label: "Outdoors" },
]);

export const CREW_ROLES = opts([
  { value: "photographer", label: "Photographer" },
  { value: "videographer", label: "Videographer" },
  { value: "sound_technician", label: "Sound technician" },
  { value: "lighting_technician", label: "Lighting technician" },
  { value: "stage_hand", label: "Stage hand" },
  { value: "makeup_artist", label: "Makeup artist" },
  { value: "decorator", label: "Decorator" },
  { value: "security", label: "Security" },
  { value: "hospitality_staff", label: "Hospitality staff" },
]);
