"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";
import { audit } from "@/lib/audit";
import { notifyAll } from "@/lib/notify";
import { getSubjects } from "@/lib/subjects";
import { deleteUpload, isFile, saveUpload } from "@/lib/upload";
import type { ActionState } from "@/lib/ui";
import { MATERIAL_CATEGORIES } from "@/lib/labels";

const schema = z.object({
  title: z.string().trim().min(3, "Judul minimal 3 karakter.").max(120, "Judul terlalu panjang."),
  category: z.string().refine((v) => MATERIAL_CATEGORIES.includes(v), "Pilih kategori dari daftar."),
  subject: z.string().trim().max(120),
  link: z
    .string()
    .trim()
    .max(500, "Tautan terlalu panjang.")
    .refine((v) => v === "" || /^https?:\/\//i.test(v), "Tautan harus diawali http:// atau https://"),
});

function parse(fd: FormData) {
  return schema.safeParse({
    title: fd.get("title"),
    category: fd.get("category") ?? "",
    subject: fd.get("subject") ?? "",
    link: fd.get("link") ?? "",
  });
}

async function checkSubject(subject: string, current?: string | null) {
  if (!subject) return { value: null };
  if (subject === current) return { value: subject };
  const subjects = await getSubjects();
  const hit = subjects.find((s) => s.toLowerCase() === subject.toLowerCase());
  return hit ? { value: hit } : { error: "Pilih mata kuliah dari daftar jadwal." };
}

async function resolveFile(fd: FormData, current: string | null) {
  const file = fd.get("file");
  const link = String(fd.get("link") ?? "").trim();
  if (isFile(file)) {
    const res = await saveUpload(file, { doc: true, image: true }, 25);
    if ("error" in res) return { error: res.error };
    return { url: res.url };
  }
  if (link) return { url: link };
  if (current) return { url: current };
  return { error: "Unggah file atau isi tautan materi." };
}

function refresh() {
  revalidatePath("/");
  revalidatePath("/materi");
  revalidatePath("/admin/materi");
}

const label = (title: string, subject: string | null) => (subject ? `${subject}: ${title}` : title);

export async function createMaterial(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const session = await requireAdmin();
  const r = parse(fd);
  if (!r.success) return { error: r.error.issues[0].message };
  const subj = await checkSubject(r.data.subject);
  if ("error" in subj) return { error: subj.error };
  const f = await resolveFile(fd, null);
  if ("error" in f) return { error: f.error };

  const m = await prisma.material.create({
    data: { title: r.data.title, category: r.data.category || null, subject: subj.value, fileUrl: f.url!, uploadedBy: session.user.id },
  });
  await audit(session.user.id, "material.create", "Material", m.id);
  await notifyAll({
    exceptUserId: session.user.id,
    type: "material",
    message: `Materi baru · ${label(m.title, m.subject)}`,
    link: m.subject ? `/materi?matkul=${encodeURIComponent(m.subject)}` : "/materi",
  });
  refresh();
  return { ok: true };
}

export async function updateMaterial(id: string, _prev: ActionState, fd: FormData): Promise<ActionState> {
  const session = await requireAdmin();
  const existing = await prisma.material.findUnique({ where: { id }, select: { fileUrl: true, subject: true } });
  if (!existing) return { error: "Materi sudah dihapus." };
  const r = parse(fd);
  if (!r.success) return { error: r.error.issues[0].message };
  const subj = await checkSubject(r.data.subject, existing.subject);
  if ("error" in subj) return { error: subj.error };
  const f = await resolveFile(fd, existing.fileUrl);
  if ("error" in f) return { error: f.error };

  const fileChanged = f.url !== existing.fileUrl;
  if (fileChanged) await deleteUpload(existing.fileUrl);
  const m = await prisma.material.update({
    where: { id },
    data: { title: r.data.title, category: r.data.category || null, subject: subj.value, fileUrl: f.url! },
  });
  await audit(session.user.id, "material.update", "Material", id);
  if (fileChanged) {
    await notifyAll({
      exceptUserId: session.user.id,
      type: "material",
      message: `Materi diperbarui · ${label(m.title, m.subject)}`,
      link: m.subject ? `/materi?matkul=${encodeURIComponent(m.subject)}` : "/materi",
    });
  }
  refresh();
  return { ok: true };
}

export async function deleteMaterial(id: string) {
  const session = await requireAdmin();
  const m = await prisma.material.findUnique({ where: { id }, select: { fileUrl: true } });
  if (!m) return;
  await prisma.material.delete({ where: { id } });
  await deleteUpload(m.fileUrl);
  await audit(session.user.id, "material.delete", "Material", id);
  refresh();
}
