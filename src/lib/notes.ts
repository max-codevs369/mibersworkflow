export const NOTE_TONE: Record<string, string> = {
  YELLOW: "#e0c062",
  ORANGE: "#f5822a",
  PINK: "#e29ab5",
  BLUE: "#8db3df",
  GREEN: "#8cc28a",
};

export const NOTE_COLOR_NAME: Record<string, string> = {
  YELLOW: "Kuning",
  ORANGE: "Oranye",
  PINK: "Merah muda",
  BLUE: "Biru",
  GREEN: "Hijau",
};

export const ROLE_LABEL: Record<string, string> = {
  ADMIN: "Pengurus",
  MEMBER: "Anggota",
  GUEST: "Tamu",
};

export const TYPE_LABEL = {
  DAILY: "Kata hari ini",
  MOTIVATION: "Motivasi",
  MESSAGE: "Pesan",
  REMINDER: "Pengingat",
} as const;

export type NoteTypeKey = keyof typeof TYPE_LABEL;

export const REACTIONS = ["❤️", "😂", "👍", "🔥"];

export function noteVisibleWhere(now = new Date()) {
  return {
    status: "APPROVED" as const,
    showFrom: { lte: now },
    OR: [{ showUntil: null }, { showUntil: { gt: now } }],
  };
}

export function noteAuthorLine(n: { isAnonymous: boolean; authorName: string; authorKind: string }) {
  if (n.isAnonymous) return "Anonim";
  if (n.authorKind === "GUEST") return n.authorName;
  return `${n.authorName} · ${ROLE_LABEL[n.authorKind]}`;
}
