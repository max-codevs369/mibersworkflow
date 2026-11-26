"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";
import { audit } from "@/lib/audit";
import { deleteUpload, isFile, saveUpload } from "@/lib/upload";
import type { ActionState } from "@/lib/ui";
import { descendantsOf } from "@/lib/orgtree";

function refresh() {
  revalidatePath("/");
  revalidatePath("/struktur");
  revalidatePath("/admin/struktur");
}

const periodSchema = z
  .object({
    name: z.string().trim().min(3, "Nama periode minimal 3 karakter.").max(80, "Nama terlalu panjang."),
    startYear: z.coerce.number().int().min(2000, "Tahun tidak valid.").max(2100, "Tahun tidak valid."),
    endYear: z.coerce.number().int().min(2000, "Tahun tidak valid.").max(2100, "Tahun tidak valid."),
  })
  .refine((d) => d.endYear >= d.startYear, "Tahun selesai tidak boleh sebelum tahun mulai.");

export async function savePeriod(id: string | null, _prev: ActionState, fd: FormData): Promise<ActionState> {
  const session = await requireAdmin();
  const r = periodSchema.safeParse({ name: fd.get("name"), startYear: fd.get("startYear"), endYear: fd.get("endYear") });
  if (!r.success) return { error: r.error.issues[0].message };
  const makeActive = fd.get("isActive") === "on";

  if (id) {
    const res = await prisma.organizationPeriod.updateMany({ where: { id }, data: r.data });
    if (!res.count) return { error: "Periode sudah dihapus." };
    await audit(session.user.id, "period.update", "OrganizationPeriod", id);
  } else {
    const anyActive = await prisma.organizationPeriod.count({ where: { isActive: true } });
    const p = await prisma.organizationPeriod.create({ data: { ...r.data, isActive: !anyActive } });
    id = p.id;
    await audit(session.user.id, "period.create", "OrganizationPeriod", id);
  }
  if (makeActive) await activate(id);
  refresh();
  return { ok: true };
}

async function activate(id: string) {
  await prisma.$transaction([
    prisma.organizationPeriod.updateMany({ where: { id: { not: id } }, data: { isActive: false } }),
    prisma.organizationPeriod.update({ where: { id }, data: { isActive: true } }),
  ]);
}

export async function activatePeriod(id: string) {
  const session = await requireAdmin();
  await activate(id);
  await audit(session.user.id, "period.activate", "OrganizationPeriod", id);
  refresh();
}

export async function deletePeriod(id: string) {
  const session = await requireAdmin();
  const members = await prisma.organizationMember.findMany({ where: { periodId: id }, select: { photoUrl: true } });
  await prisma.organizationPeriod.deleteMany({ where: { id } });
  await Promise.all(members.map((m) => deleteUpload(m.photoUrl)));
  await audit(session.user.id, "period.delete", "OrganizationPeriod", id);
  refresh();
}

const positionSchema = z.object({
  title: z.string().trim().min(2, "Nama jabatan minimal 2 karakter.").max(60, "Nama terlalu panjang."),
  level: z.coerce.number().int().min(0, "Tingkat minimal 0.").max(9, "Tingkat maksimal 9."),
  sortOrder: z.coerce.number().int().min(0).max(999),
});

async function relevelTree() {
  const all = await prisma.position.findMany({ select: { id: true, level: true, parentId: true } });
  const byId = new Map(all.map((p) => [p.id, { ...p }]));
  for (let round = 0; round < 12; round++) {
    let changed = false;
    for (const p of byId.values()) {
      if (!p.parentId) continue;
      const parent = byId.get(p.parentId);
      if (!parent) continue;
      const want = Math.min(9, parent.level + 1);
      if (p.level !== want) {
        p.level = want;
        changed = true;
      }
    }
    if (!changed) break;
  }
  const updates = [...byId.values()].filter((p) => all.find((o) => o.id === p.id)!.level !== p.level);
  if (updates.length) {
    await prisma.$transaction(updates.map((p) => prisma.position.update({ where: { id: p.id }, data: { level: p.level } })));
  }
}

export async function savePosition(id: string | null, _prev: ActionState, fd: FormData): Promise<ActionState> {
  const session = await requireAdmin();
  const r = positionSchema.safeParse({
    title: fd.get("title"),
    level: fd.get("level"),
    sortOrder: fd.get("sortOrder") || 0,
  });
  if (!r.success) return { error: r.error.issues[0].message };

  const rawParent = String(fd.get("parentId") ?? "").trim();
  let parentId: string | null = null;
  let level = r.data.level;
  if (rawParent) {
    const all = await prisma.position.findMany({ select: { id: true, title: true, level: true, sortOrder: true, parentId: true } });
    const parent = all.find((p) => p.id === rawParent);
    if (!parent) return { error: "Jabatan atasan tidak ditemukan." };
    if (id && (rawParent === id || descendantsOf(all, id).has(rawParent))) {
      return { error: "Jabatan tidak bisa berada di bawah dirinya sendiri atau bawahannya." };
    }
    parentId = parent.id;
    level = Math.min(9, parent.level + 1);
  }

  const data = { ...r.data, level, parentId };
  if (id) {
    const res = await prisma.position.updateMany({ where: { id }, data });
    if (!res.count) return { error: "Jabatan sudah dihapus." };
    await audit(session.user.id, "position.update", "Position", id);
  } else {
    const p = await prisma.position.create({ data });
    await audit(session.user.id, "position.create", "Position", p.id);
  }
  await relevelTree();
  refresh();
  return { ok: true };
}

export async function deletePosition(id: string) {
  const session = await requireAdmin();
  const used = await prisma.organizationMember.count({ where: { positionId: id } });
  if (used) return { error: `Jabatan ini masih dipakai ${used} pengurus. Pindahkan atau hapus pengurusnya dulu.` };
  await prisma.position.updateMany({ where: { parentId: id }, data: { parentId: null } });
  await prisma.position.deleteMany({ where: { id } });
  await audit(session.user.id, "position.delete", "Position", id);
  refresh();
}

export async function saveMember(
  periodId: string,
  id: string | null,
  _prev: ActionState,
  fd: FormData
): Promise<ActionState> {
  const session = await requireAdmin();
  const positionId = String(fd.get("positionId") ?? "");
  const userId = String(fd.get("userId") ?? "") || null;
  const displayName = String(fd.get("displayName") ?? "").trim().slice(0, 80) || null;
  const sortOrder = Math.max(0, Math.min(999, Math.floor(Number(fd.get("sortOrder")) || 0)));

  if (!positionId || !(await prisma.position.findUnique({ where: { id: positionId }, select: { id: true } }))) {
    return { error: "Pilih jabatan." };
  }
  if (!userId && !displayName) return { error: "Pilih akun anggota atau isi nama yang ditampilkan." };
  if (!id && !(await prisma.organizationPeriod.findUnique({ where: { id: periodId }, select: { id: true } }))) {
    return { error: "Periode sudah dihapus." };
  }
  if (userId && !(await prisma.user.findUnique({ where: { id: userId }, select: { id: true } }))) {
    return { error: "Akun tidak ditemukan." };
  }

  const current = id
    ? await prisma.organizationMember.findUnique({ where: { id }, select: { photoUrl: true } })
    : null;
  if (id && !current) return { error: "Data pengurus sudah dihapus." };

  let photoUrl = current?.photoUrl ?? null;
  const photo = fd.get("photo");
  if (isFile(photo)) {
    const res = await saveUpload(photo, { image: true }, 5);
    if ("error" in res) return { error: res.error };
    await deleteUpload(photoUrl);
    photoUrl = res.url;
  } else if (fd.get("photo_remove")) {
    await deleteUpload(photoUrl);
    photoUrl = null;
  }

  const data = { positionId, userId, displayName, sortOrder, photoUrl };
  if (id) {
    await prisma.organizationMember.update({ where: { id }, data });
    await audit(session.user.id, "orgmember.update", "OrganizationMember", id);
  } else {
    const m = await prisma.organizationMember.create({ data: { ...data, periodId } });
    await audit(session.user.id, "orgmember.create", "OrganizationMember", m.id);
  }
  refresh();
  return { ok: true };
}

export async function deleteMember(id: string) {
  const session = await requireAdmin();
  const m = await prisma.organizationMember.findUnique({ where: { id }, select: { photoUrl: true } });
  if (!m) return;
  await prisma.organizationMember.delete({ where: { id } });
  await deleteUpload(m.photoUrl);
  await audit(session.user.id, "orgmember.delete", "OrganizationMember", id);
  refresh();
}
