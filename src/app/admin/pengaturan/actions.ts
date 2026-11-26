"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/session";
import { audit } from "@/lib/audit";
import { getSettings, type SettingKey } from "@/lib/settings";
import { deleteUpload, isFile, saveUpload } from "@/lib/upload";
import type { ActionState } from "@/lib/ui";

const text = (max: number, msg: string) => z.string().trim().max(max, msg);
const limit = z.coerce.number().int().min(0, "Batas minimal 0.").max(100, "Batas maksimal 100.");

const schema = z.object({
  site_name: z.string().trim().min(2, "Nama situs minimal 2 karakter.").max(60, "Nama situs terlalu panjang."),
  site_short: text(20, "Nama singkat maksimal 20 karakter."),
  site_tagline: text(80, "Slogan terlalu panjang."),
  site_description: text(240, "Deskripsi terlalu panjang."),
  school_name: text(100, "Nama kampus terlalu panjang."),
  department: text(100, "Nama jurusan terlalu panjang."),
  study_program: text(100, "Nama program studi terlalu panjang."),
  class_year: text(20, "Angkatan terlalu panjang."),
  homeroom: text(80, "Nama dosen wali terlalu panjang."),
  instagram: z
    .string()
    .trim()
    .max(200)
    .refine((v) => v === "" || /^https?:\/\//i.test(v), "Tautan Instagram harus diawali https://"),
  contact_email: z.union([z.literal(""), z.string().trim().email("Email kontak tidak valid.")]),
  note_guest_daily_limit: limit,
  note_member_daily_limit: limit,
});

export async function saveSettings(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const session = await requireSuperAdmin();
  const get = (k: string) => String(fd.get(k) ?? "");
  const r = schema.safeParse({
    site_name: get("site_name"),
    site_short: get("site_short"),
    site_tagline: get("site_tagline"),
    site_description: get("site_description"),
    school_name: get("school_name"),
    department: get("department"),
    study_program: get("study_program"),
    class_year: get("class_year"),
    homeroom: get("homeroom"),
    instagram: get("instagram"),
    contact_email: get("contact_email"),
    note_guest_daily_limit: get("note_guest_daily_limit") || "0",
    note_member_daily_limit: get("note_member_daily_limit") || "0",
  });
  if (!r.success) return { error: r.error.issues[0].message };

  const values: Partial<Record<SettingKey, string>> = {};
  for (const [k, v] of Object.entries(r.data)) values[k as SettingKey] = String(v);
  values.note_guest_enabled = fd.get("note_guest_enabled") === "on" ? "true" : "false";
  values.note_member_auto_approve = fd.get("note_member_auto_approve") === "on" ? "true" : "false";
  values.gallery_member_auto_approve = fd.get("gallery_member_auto_approve") === "on" ? "true" : "false";

  const current = await getSettings();
  const hero = fd.get("hero_image");
  if (isFile(hero)) {
    const res = await saveUpload(hero, { image: true }, 8);
    if ("error" in res) return { error: res.error };
    await deleteUpload(current.hero_image);
    values.hero_image = res.url;
  } else if (fd.get("hero_image_remove")) {
    await deleteUpload(current.hero_image);
    values.hero_image = "";
  }

  await prisma.$transaction(
    Object.entries(values).map(([key, value]) =>
      prisma.siteSetting.upsert({ where: { key }, update: { value: value! }, create: { key, value: value! } })
    )
  );
  await audit(session.user.id, "settings.update", "SiteSetting", null);
  revalidatePath("/", "layout");
  return { ok: true, message: "Pengaturan tersimpan." };
}
