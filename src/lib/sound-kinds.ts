export const SOUND_KINDS = [
  { kind: "chat", label: "Pesan obrolan", hint: "Pesan pribadi dan grup" },
  { kind: "announcement", label: "Pengumuman", hint: "Pengumuman kelas baru" },
  { kind: "finance", label: "Kas kelas", hint: "Pengingat bayar, tenggat, tunggakan, status pembayaran" },
  { kind: "reminder", label: "Pengingat", hint: "Pengingat agenda H-1" },
  { kind: "piket", label: "Piket", hint: "Giliran piket hari ini" },
  { kind: "event", label: "Agenda kelas", hint: "Agenda baru atau diubah" },
  { kind: "material", label: "Materi kuliah", hint: "Materi baru diunggah" },
  { kind: "media", label: "Galeri", hint: "Kabar foto dan album" },
  { kind: "note", label: "Dinding catatan", hint: "Kabar catatan di dinding" },
  { kind: "group", label: "Grup obrolan", hint: "Ditambahkan ke grup dan kabar grup" },
  { kind: "moderation", label: "Perlu dicek", hint: "Kiriman yang menunggu persetujuan pengurus" },
] as const;

export type SoundKind = (typeof SOUND_KINDS)[number]["kind"];

export const isSoundKind = (v: unknown): v is SoundKind => typeof v === "string" && SOUND_KINDS.some((k) => k.kind === v);

export const MAX_SOUND_SECONDS = 3;
export const MAX_SOUND_BYTES = 300_000;
