const TZ = "Asia/Jakarta";

const dayKey = (d: Date) => d.toLocaleDateString("sv-SE", { timeZone: TZ });

export const clock = (iso: string) =>
  new Date(iso).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: TZ });

export function sameDay(a: string, b: string) {
  return dayKey(new Date(a)) === dayKey(new Date(b));
}

export function dayLabel(iso: string, now = new Date()) {
  const d = new Date(iso);
  const diff = Math.round(
    (new Date(dayKey(now)).getTime() - new Date(dayKey(d)).getTime()) / 86_400_000
  );
  if (diff === 0) return "Hari ini";
  if (diff === 1) return "Kemarin";
  if (diff > 1 && diff < 7) return d.toLocaleDateString("id-ID", { weekday: "long", timeZone: TZ });
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric", timeZone: TZ });
}

export function listTime(iso: string, now = new Date()) {
  const label = dayLabel(iso, now);
  if (label === "Hari ini") return clock(iso);
  if (label.includes(" ")) {
    return new Date(iso).toLocaleDateString("id-ID", { day: "2-digit", month: "2-digit", year: "2-digit", timeZone: TZ });
  }
  return label;
}

const NAME_TONES = ["#fc9775", "#53bdeb", "#ffd279", "#a5b337", "#e26ab6", "#25d366", "#ff72a1", "#a791ff", "#06cf9c", "#fa6533"];
export function nameTone(key: string) {
  let h = 0;
  for (const c of key) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return NAME_TONES[h % NAME_TONES.length];
}

const GROUP_TONES = ["#00a884", "#53bdeb", "#e26ab6", "#fa6533", "#a791ff", "#ffd279", "#f5822a"];
export function groupTone(key: string) {
  let h = 7;
  for (const c of key) h = (h * 17 + c.charCodeAt(0)) >>> 0;
  return GROUP_TONES[h % GROUP_TONES.length];
}

export function groupInitials(title: string) {
  const w = title.replace(/[^\p{L}\p{N}\s]/gu, "").trim().split(/\s+/).filter(Boolean);
  return ((w[0]?.[0] ?? "#") + (w[1]?.[0] ?? "")).toUpperCase();
}

export function isEmojiOnly(text: string) {
  const t = text.trim();
  if (!t || t.length > 24) return false;
  if (!/^(?:\p{Extended_Pictographic}|\p{Emoji_Modifier}|‍|️|\s)+$/u.test(t)) return false;
  return [...t.matchAll(/\p{Extended_Pictographic}/gu)].length <= 3;
}
