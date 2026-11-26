export type Waktu = "semua" | "sekarang" | "terdahulu";

export const WAKTU_OPTIONS: { value: Waktu; label: string }[] = [
  { value: "semua", label: "Semua" },
  { value: "sekarang", label: "Sekarang" },
  { value: "terdahulu", label: "Terdahulu" },
];

export function parseWaktu(v: string | undefined, fallback: Waktu = "semua"): Waktu {
  return v === "semua" || v === "sekarang" || v === "terdahulu" ? v : fallback;
}

export const daysAgo = (days: number, now = new Date()) => new Date(now.getTime() - days * 86_400_000);

export const jakartaYear = (now = new Date()) =>
  Number(now.toLocaleString("en-US", { timeZone: "Asia/Jakarta", year: "numeric" }));

export function startOfYearJakarta(now = new Date()) {
  return new Date(Date.UTC(jakartaYear(now), 0, 1, -7));
}

export function cleanQuery(v: string | undefined, max = 80) {
  return (v ?? "").trim().slice(0, max);
}
