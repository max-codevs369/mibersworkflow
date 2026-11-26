"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { requireUser } from "@/lib/session";
import { parseInputDate } from "@/lib/format";
import { deleteUpload, isFile, saveUpload } from "@/lib/upload";
import type { ActionState } from "@/lib/ui";

const profileSchema = z.object({
  name: z.string().trim().min(2, "Nama minimal 2 karakter.").max(80, "Nama terlalu panjang."),
  nickname: z.string().trim().max(30, "Nama panggilan maksimal 30 karakter."),
  bio: z.string().trim().max(300, "Bio maksimal 300 karakter."),
  instagram: z.string().trim().max(120, "Instagram terlalu panjang."),
  phone: z
    .string()
    .trim()
    .max(20, "Nomor terlalu panjang.")
    .refine((v) => v === "" || /^[0-9+\-\s]{8,20}$/.test(v), "Nomor HP tidak valid."),
  birthday: z.string().trim(),
});

export async function updateProfile(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireUser("/akun");
  const parsed = profileSchema.safeParse({
    name: formData.get("name"),
    nickname: formData.get("nickname") ?? "",
    bio: formData.get("bio") ?? "",
    instagram: formData.get("instagram") ?? "",
    phone: formData.get("phone") ?? "",
    birthday: formData.get("birthday") ?? "",
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const d = parsed.data;

  const birthday = d.birthday ? parseInputDate(d.birthday) : null;
  if (d.birthday && !birthday) return { error: "Tanggal lahir tidak valid." };

  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { image: true } });
  let image = user?.image ?? null;

  const photo = formData.get("photo");
  if (isFile(photo)) {
    const res = await saveUpload(photo, { image: true }, 5);
    if ("error" in res) return { error: res.error };
    await deleteUpload(image);
    image = res.url;
  } else if (formData.get("photo_remove")) {
    await deleteUpload(image);
    image = null;
  }

  const profile = {
    nickname: d.nickname || null,
    bio: d.bio || null,
    instagram: d.instagram || null,
    phone: d.phone || null,
    birthday,
  };

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      name: d.name,
      image,
      profile: { upsert: { create: profile, update: profile } },
    },
  });

  revalidatePath("/", "layout");
  return { ok: true, message: "Profil tersimpan." };
}

export async function changePassword(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireUser("/akun");
  const current = String(formData.get("current") ?? "");
  const next = String(formData.get("next") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (!current) return { error: "Isi kata sandi lama." };
  if (next.length < 8) return { error: "Kata sandi baru minimal 8 karakter." };
  if (next.length > 128) return { error: "Kata sandi terlalu panjang." };
  if (next !== confirm) return { error: "Konfirmasi kata sandi tidak sama." };
  if (next === current) return { error: "Kata sandi baru harus berbeda dari yang lama." };

  try {
    await auth.api.changePassword({
      body: { currentPassword: current, newPassword: next, revokeOtherSessions: true },
      headers: await headers(),
    });
  } catch {
    return { error: "Kata sandi lama salah." };
  }
  return { ok: true, message: "Kata sandi berhasil diganti. Perangkat lain sudah dikeluarkan." };
}

export async function markAllRead() {
  const session = await requireUser("/akun/notifikasi");
  await prisma.notification.updateMany({
    where: { userId: session.user.id, isRead: false },
    data: { isRead: true },
  });
  revalidatePath("/", "layout");
}

export async function clearRead() {
  const session = await requireUser("/akun/notifikasi");
  await prisma.notification.deleteMany({ where: { userId: session.user.id, isRead: true } });
  revalidatePath("/akun/notifikasi");
}

export async function openNotification(id: string) {
  const session = await requireUser("/akun/notifikasi");
  await prisma.notification.updateMany({ where: { id, userId: session.user.id }, data: { isRead: true } });
  revalidatePath("/", "layout");
}
