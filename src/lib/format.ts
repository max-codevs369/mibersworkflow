import { SITE } from "@/lib/site";

const TZ = SITE.timezone;
const BULAN = ["JAN", "FEB", "MAR", "APR", "MEI", "JUN", "JUL", "AGU", "SEP", "OKT", "NOV", "DES"];

const part = (d: Date, opt: Intl.DateTimeFormatOptions) =>
  Number(d.toLocaleString("en-US", { timeZone: TZ, ...opt }));

export const dayOf = (d: Date) => String(part(d, { day: "numeric" }));

export const monthOf = (d: Date) => BULAN[part(d, { month: "numeric" }) - 1];

export const longDate = (d: Date) =>
  d.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric", timeZone: TZ });

export const shortDate = (d: Date) =>
  d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric", timeZone: TZ });

export const dayMonth = (d: Date) =>
  d.toLocaleDateString("id-ID", { day: "numeric", month: "long", timeZone: TZ });

export const weekdayName = (d: Date) =>
  d.toLocaleDateString("id-ID", { weekday: "long", timeZone: TZ });

export const timeOf = (d: Date) =>
  d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: TZ }).replace(".", ":");

export const longDateTime = (d: Date) =>
  d.toLocaleString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: TZ,
  });

export const toInputDateTime = (d: Date | null) =>
  d ? d.toLocaleString("sv-SE", { timeZone: TZ, hour12: false }).slice(0, 16).replace(" ", "T") : "";

export const toInputDate = (d: Date | null) =>
  d ? d.toLocaleDateString("sv-SE", { timeZone: TZ }) : "";

export function isValidDateKey(v: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const d = new Date(`${v}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
}

export function parseInputDateTime(v: string): Date | null {
  const m = /^(\d{4}-\d{2}-\d{2})T((?:[01]\d|2[0-3]):[0-5]\d)(:[0-5]\d)?$/.exec(v ?? "");
  if (!m || !isValidDateKey(m[1])) return null;
  const d = new Date(`${m[1]}T${m[2]}${m[3] ?? ":00"}${SITE.utcOffset}`);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function parseInputDate(v: string): Date | null {
  if (!isValidDateKey(v)) return null;
  const d = new Date(`${v}T00:00:00${SITE.utcOffset}`);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function relativeTime(d: Date, now = new Date()) {
  const s = Math.round((now.getTime() - d.getTime()) / 1000);
  if (s < 45) return "baru saja";
  const m = Math.round(s / 60);
  if (m < 60) return `${m} menit lalu`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} jam lalu`;
  const days = Math.round(h / 24);
  if (days === 1) return "kemarin";
  if (days < 7) return `${days} hari lalu`;
  return shortDate(d);
}

export function daysUntil(d: Date, now = new Date()) {
  const key = (x: Date) => x.toLocaleDateString("sv-SE", { timeZone: TZ });
  const a = new Date(`${key(now)}T00:00:00Z`).getTime();
  const b = new Date(`${key(d)}T00:00:00Z`).getTime();
  return Math.round((b - a) / 86400000);
}

export const WEEKDAYS = [
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
  "SUNDAY",
] as const;
export type WeekdayKey = (typeof WEEKDAYS)[number];

export const WEEKDAY_LABEL: Record<WeekdayKey, string> = {
  MONDAY: "Senin",
  TUESDAY: "Selasa",
  WEDNESDAY: "Rabu",
  THURSDAY: "Kamis",
  FRIDAY: "Jumat",
  SATURDAY: "Sabtu",
  SUNDAY: "Minggu",
};

export function todayWeekday(now = new Date()): WeekdayKey {
  const en = now.toLocaleDateString("en-US", { weekday: "long", timeZone: TZ }).toUpperCase();
  return (WEEKDAYS as readonly string[]).includes(en) ? (en as WeekdayKey) : "MONDAY";
}

export function initials(name: string) {
  const p = name.trim().split(/\s+/).filter(Boolean);
  if (p.length === 0) return "?";
  return ((p[0][0] ?? "") + (p.length > 1 ? p[p.length - 1][0] : "")).toUpperCase();
}

export function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export const clockNow = (now = new Date()) =>
  now.toLocaleTimeString("en-GB", { timeZone: TZ, hour: "2-digit", minute: "2-digit", hour12: false });
