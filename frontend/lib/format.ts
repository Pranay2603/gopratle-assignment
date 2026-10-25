const inr = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });

export const formatINR = (n?: number | null) => (typeof n === "number" && Number.isFinite(n) ? inr.format(n) : "");

export const formatBudget = (b?: { min?: number | ""; max?: number | "" }) => {
  if (!b || typeof b.max !== "number") return "";
  const min = typeof b.min === "number" ? b.min : 0;
  return min === b.max ? formatINR(min) : `${formatINR(min)} to ${formatINR(b.max)}`;
};

/** "2026-12-14" -> "Mon, 14 Dec 2026" without timezone drift. */
export const formatDate = (iso?: string) => {
  if (!iso) return "";
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
};

export const formatDates = (start?: string, end?: string, mode?: string) =>
  mode === "range" && end ? `${formatDate(start)} to ${formatDate(end)}` : formatDate(start);

/** "16:30" -> "4:30 pm" */
export const formatTime = (hhmm?: string) => {
  if (!hhmm || !/^\d{2}:\d{2}$/.test(hhmm)) return hhmm ?? "";
  const [h, m] = hhmm.split(":").map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h < 12 ? "am" : "pm"}`;
};

export const formatDuration = (mins?: number | "") => {
  if (typeof mins !== "number" || !Number.isFinite(mins)) return "";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return [h ? `${h} hr` : "", m ? `${m} min` : ""].filter(Boolean).join(" ");
};
