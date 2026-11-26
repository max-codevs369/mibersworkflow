"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";
import { audit } from "@/lib/audit";
import { deleteUpload, isFile, saveUpload } from "@/lib/upload";
import type { ActionState } from "@/lib/ui";

const schema = z.object({
  title: z.string().trim().min(2, "Judul minimal 2 karakter.").max(80, "Judul terlalu panjang."),
  content: z.string().trim().min(3, "Isi minimal 3 karakter.").max(4000, "Isi terlalu panjang."),
  isVisible: z.boolean(),
});

function refresh() {
  revalidatePath("/");
  revalidatePath("/tentang");
  revalidatePath("/admin/tentang");
}

async function image(fd: FormData, current: string | null) {
  const f = fd.get("image");
  if (isFile(f)) {
    const res = await saveUpload(f, { image: true }, 8);
    if ("error" in res) return { error: res.error };
    await deleteUpload(current);
    return { url: res.url };
  }
  if (fd.get("image_remove")) {
    await deleteUpload(current);
    return { url: null };
  }
  return { url: current };
}

export async function createAbout(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const session = await requireAdmin();
  const r = schema.safeParse({ title: fd.get("title"), content: fd.get("content"), isVisible: fd.get("isVisible") === "on" });
  if (!r.success) return { error: r.error.issues[0].message };
  const img = await image(fd, null);
  if ("error" in img) return { error: img.error };
  const last = await prisma.aboutSection.findFirst({ orderBy: { sortOrder: "desc" }, select: { sortOrder: true } });
  const s = await prisma.aboutSection.create({
    data: { ...r.data, imageUrl: img.url ?? null, sortOrder: (last?.sortOrder ?? 0) + 1 },
  });
  await audit(session.user.id, "about.create", "AboutSection", s.id);
  refresh();
  return { ok: true };
}

export async function updateAbout(id: string, _prev: ActionState, fd: FormData): Promise<ActionState> {
  const session = await requireAdmin();
  const cur = await prisma.aboutSection.findUnique({ where: { id }, select: { imageUrl: true } });
  if (!cur) return { error: "Bagian ini sudah dihapus." };
  const r = schema.safeParse({ title: fd.get("title"), content: fd.get("content"), isVisible: fd.get("isVisible") === "on" });
  if (!r.success) return { error: r.error.issues[0].message };
  const img = await image(fd, cur.imageUrl);
  if ("error" in img) return { error: img.error };
  await prisma.aboutSection.update({ where: { id }, data: { ...r.data, imageUrl: img.url ?? null } });
  await audit(session.user.id, "about.update", "AboutSection", id);
  refresh();
  return { ok: true };
}

export async function deleteAbout(id: string) {
  const session = await requireAdmin();
  const cur = await prisma.aboutSection.findUnique({ where: { id }, select: { imageUrl: true } });
  if (!cur) return;
  await prisma.aboutSection.delete({ where: { id } });
  await deleteUpload(cur.imageUrl);
  await audit(session.user.id, "about.delete", "AboutSection", id);
  refresh();
}

export async function moveAbout(id: string, dir: "up" | "down") {
  await requireAdmin();
  const all = await prisma.aboutSection.findMany({ orderBy: [{ sortOrder: "asc" }, { id: "asc" }], select: { id: true } });
  const i = all.findIndex((s) => s.id === id);
  const j = dir === "up" ? i - 1 : i + 1;
  if (i < 0 || j < 0 || j >= all.length) return;
  [all[i], all[j]] = [all[j], all[i]];
  await prisma.$transaction(all.map((s, k) => prisma.aboutSection.update({ where: { id: s.id }, data: { sortOrder: k + 1 } })));
  refresh();
}
