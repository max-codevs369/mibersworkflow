export const CATEGORY_LABEL: Record<string, string> = {
  GENERAL: "Umum",
  ACADEMIC: "Akademik",
  ACTIVITY: "Kegiatan",
  FINANCE: "Keuangan",
  DUTY: "Piket",
  OTHER: "Lainnya",
};

export const PRIORITY_LABEL: Record<string, string> = {
  NORMAL: "Normal",
  IMPORTANT: "Penting",
  URGENT: "Mendesak",
};

export function publicWhere(now = new Date()) {
  return {
    status: "PUBLISHED" as const,
    publishedAt: { lte: now },
    OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
  };
}

export const isNew = (publishedAt: Date, now = new Date()) =>
  now.getTime() - publishedAt.getTime() < 3 * 86400000;