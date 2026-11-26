export const EVENT_TYPE_LABEL = {
  EXAM: "Ujian",
  ACTIVITY: "Kegiatan",
  BIRTHDAY: "Ulang tahun",
  HOLIDAY: "Libur",
  OTHER: "Lainnya",
} as const;
export type EventTypeKey = keyof typeof EVENT_TYPE_LABEL;

export const EVENT_TYPE_TONE: Record<EventTypeKey, string> = {
  EXAM: "bg-danger/15 text-danger",
  ACTIVITY: "bg-brand/15 text-brand",
  BIRTHDAY: "bg-pink/15 text-pink",
  HOLIDAY: "bg-ok/15 text-ok",
  OTHER: "bg-surface-3 text-muted",
};

export const MODERATION_LABEL = {
  PENDING: "Menunggu",
  APPROVED: "Disetujui",
  REJECTED: "Ditolak",
  HIDDEN: "Disembunyikan",
} as const;

export const VISIBILITY_LABEL = {
  PUBLIC: "Publik",
  MEMBERS_ONLY: "Khusus anggota",
} as const;

export const MATERIAL_CATEGORIES = [
  "Mata kuliah umum",
  "Mata kuliah keahlian",
  "Praktikum",
  "Modul & diktat",
  "Tugas",
  "Ujian (UTS/UAS)",
  "Lainnya",
];

export const FEATURED_MAX = 3;

export const ALBUM_CATEGORY_LABEL = {
  KEGIATAN: "Kegiatan kelas",
  KULIAH: "Kuliah & praktikum",
  KAMPUS: "Acara kampus",
  LOMBA: "Lomba & prestasi",
  JALAN: "Jalan-jalan",
  LAINNYA: "Lainnya",
} as const;
export type AlbumCategoryKey = keyof typeof ALBUM_CATEGORY_LABEL;
