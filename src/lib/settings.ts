import { cache } from "react";
import { prisma } from "@/lib/prisma";

export const SETTING_DEFAULTS = {
  site_name: "Mibers Duo Anam",
  site_short: "Mibers 26",
  site_tagline: "We Are Family We Are MIB",
  site_description: "Pusat informasi, obrolan, dan kenangan kelas Mibers Duo Anam.",
  school_name: "Politeknik Negeri Padang",
  department: "Teknologi Informasi",
  study_program: "D3 Manajemen Informatika",
  class_year: "2026",
  homeroom: "",
  instagram: "https://www.instagram.com/miberss_26",
  contact_email: "",
  hero_image: "",
  note_guest_enabled: "true",
  note_member_auto_approve: "true",
  note_guest_daily_limit: "3",
  note_member_daily_limit: "10",
  gallery_member_auto_approve: "false",
  piket_start_date: "2026-11-24",
  piket_start_absen: "1",
} as const;

export type SettingKey = keyof typeof SETTING_DEFAULTS;
export type Settings = Record<SettingKey, string>;

export const SETTING_KEYS = Object.keys(SETTING_DEFAULTS) as SettingKey[];

export const getSettings = cache(async (): Promise<Settings> => {
  const s: Settings = { ...SETTING_DEFAULTS };
  try {
    const rows = await prisma.siteSetting.findMany();
    for (const r of rows) {
      if (r.key in s) s[r.key as SettingKey] = r.value;
    }
  } catch {
  }
  return s;
});

export const flag = (v: string) => v === "true";
export const num = (v: string, fallback: number) => {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
};
