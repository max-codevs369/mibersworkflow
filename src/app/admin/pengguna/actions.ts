"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { hashPassword } from "better-auth/crypto";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/session";
import { audit } from "@/lib/audit";
import { deleteUpload } from "@/lib/upload";
import type { ActionState } from "@/lib/ui";
import { notifyUser } from "@/lib/notify";
import { ROLE_NAME, type RoleKey } from "@/lib/roles";

const email = z.string().trim().toLowerCase().email("Format email tidak valid.").max(120);
const password = z.string().min(8, "Kata sandi minimal 8 karakter.").max(128, "Kata sandi terlalu panjang.");
const role = z.enum(["MEMBER", "ADMIN", "SUPER_ADMIN"], { message: "Peran tidak valid." });
const name = z.string().trim().min(2, "Nama minimal 2 karakter.").max(80, "Nama terlalu panjang.");

function refresh() {
  revalidatePath("/admin/pengguna");
  revalidatePath("/tentang");
  revalidatePath("/admin", "layout");
}

async function createAccount(data: { name: string; email: string; password: string; role: "MEMBER" | "ADMIN" | "SUPER_ADMIN" }) {
  const hash = await hashPassword(data.password);
  return prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: { name: data.name, email: data.email, role: data.role, emailVerified: true, profile: { create: {} } },
    });
    await tx.account.create({
      data: { accountId: user.id, providerId: "credential", userId: user.id, password: hash },
    });
    return user;
  });
}

async function superAdminCount() {
  return prisma.user.count({ where: { role: "SUPER_ADMIN", isActive: true } });
}

export async function createUser(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const session = await requireSuperAdmin();
  const r = z
    .object({ name, email, password, role })
    .safeParse({ name: fd.get("name"), email: fd.get("email"), password: fd.get("password"), role: fd.get("role") });
  if (!r.success) return { error: r.error.issues[0].message };
  if (await prisma.user.findUnique({ where: { email: r.data.email }, select: { id: true } })) {
    return { error: "Email ini sudah terdaftar." };
  }
  const user = await createAccount(r.data);
  await audit(session.user.id, "user.create", "User", user.id);
  refresh();
  return { ok: true, message: `Akun ${user.displayName} dibuat.` };
}

export async function bulkCreateUsers(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const session = await requireSuperAdmin();
  const pw = password.safeParse(fd.get("password"));
  if (!pw.success) return { error: pw.error.issues[0].message };

  const lines = String(fd.get("lines") ?? "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length === 0) return { error: "Tulis minimal satu baris: Nama, email" };
  if (lines.length > 100) return { error: "Maksimal 100 akun sekali tambah." };

  let created = 0;
  const skipped: string[] = [];
  for (const line of lines) {
    const parts = line.split(/[;,\t]/).map((p) => p.trim());
    const n = name.safeParse(parts[0]);
    const e = email.safeParse(parts[1]);
    if (!n.success || !e.success) {
      skipped.push(`${line} (format salah)`);
      continue;
    }
    if (await prisma.user.findUnique({ where: { email: e.data }, select: { id: true } })) {
      skipped.push(`${e.data} (sudah terdaftar)`);
      continue;
    }
    const u = await createAccount({ name: n.data, email: e.data, password: pw.data, role: "MEMBER" });
    await audit(session.user.id, "user.create", "User", u.id);
    created++;
  }
  refresh();
  if (!created) return { error: `Tidak ada akun dibuat. ${skipped.slice(0, 3).join("; ")}` };
  return {
    ok: true,
    message: `${created} akun dibuat.${skipped.length ? ` Dilewati: ${skipped.slice(0, 5).join("; ")}${skipped.length > 5 ? "…" : ""}` : ""}`,
  };
}

export async function updateUser(id: string, _prev: ActionState, fd: FormData): Promise<ActionState> {
  const session = await requireSuperAdmin();
  const r = z
    .object({ name, email, role })
    .safeParse({ name: fd.get("name"), email: fd.get("email"), role: fd.get("role") });
  if (!r.success) return { error: r.error.issues[0].message };

  const target = await prisma.user.findUnique({ where: { id }, select: { role: true, isActive: true } });
  if (!target) return { error: "Akun tidak ditemukan." };
  if (id === session.user.id && r.data.role !== target.role) {
    return { error: "Kamu tidak bisa mengubah peranmu sendiri." };
  }
  if (
    target.role === "SUPER_ADMIN" &&
    target.isActive &&
    r.data.role !== "SUPER_ADMIN" &&
    (await superAdminCount()) <= 1
  ) {
    return { error: "Harus ada minimal satu Super Admin aktif." };
  }
  const dup = await prisma.user.findFirst({ where: { email: r.data.email, id: { not: id } }, select: { id: true } });
  if (dup) return { error: "Email ini sudah dipakai akun lain." };

  await prisma.user.update({ where: { id }, data: r.data });
  await audit(session.user.id, "user.update", "User", id);
  if (r.data.role !== target.role && id !== session.user.id) {
    await notifyUser(id, { type: "group", title: "👤 Akun kamu", message: `Peran akunmu sekarang ${ROLE_NAME[r.data.role as RoleKey] ?? r.data.role}.`, link: "/akun" });
  }
  refresh();
  return { ok: true };
}

export async function toggleActive(id: string) {
  const session = await requireSuperAdmin();
  if (id === session.user.id) return { error: "Kamu tidak bisa menonaktifkan akunmu sendiri." };
  const u = await prisma.user.findUnique({ where: { id }, select: { isActive: true, role: true } });
  if (!u) return { error: "Akun tidak ditemukan." };
  if (u.isActive && u.role === "SUPER_ADMIN" && (await superAdminCount()) <= 1) {
    return { error: "Harus ada minimal satu Super Admin aktif." };
  }
  await prisma.$transaction([
    prisma.user.update({ where: { id }, data: { isActive: !u.isActive } }),
    ...(u.isActive ? [prisma.session.deleteMany({ where: { userId: id } })] : []),
  ]);
  await audit(session.user.id, u.isActive ? "user.deactivate" : "user.activate", "User", id);
  refresh();
}

export async function resetPassword(id: string, _prev: ActionState, fd: FormData): Promise<ActionState> {
  const session = await requireSuperAdmin();
  const pw = password.safeParse(fd.get("password"));
  if (!pw.success) return { error: pw.error.issues[0].message };
  const user = await prisma.user.findUnique({ where: { id }, select: { id: true } });
  if (!user) return { error: "Akun tidak ditemukan." };

  const hash = await hashPassword(pw.data);
  const account = await prisma.account.findFirst({ where: { userId: id, providerId: "credential" }, select: { id: true } });
  await prisma.$transaction([
    account
      ? prisma.account.update({ where: { id: account.id }, data: { password: hash } })
      : prisma.account.create({ data: { userId: id, accountId: id, providerId: "credential", password: hash } }),
    ...(id !== session.user.id ? [prisma.session.deleteMany({ where: { userId: id } })] : []),
  ]);
  await audit(session.user.id, "user.password", "User", id);
  if (id !== session.user.id) {
    await notifyUser(id, {
      type: "group",
      title: "🔐 Keamanan akun",
      message: "Kata sandi akunmu baru saja diganti oleh pengurus. Kalau bukan kamu yang minta, segera hubungi pengurus kelas.",
      link: "/akun",
    });
  }
  return { ok: true, message: "Kata sandi diganti. Sampaikan ke pemilik akun." };
}

export async function deleteUser(id: string) {
  const session = await requireSuperAdmin();
  if (id === session.user.id) return { error: "Kamu tidak bisa menghapus akunmu sendiri." };
  const u = await prisma.user.findUnique({ where: { id }, select: { role: true, image: true, isActive: true } });
  if (!u) return { error: "Akun tidak ditemukan." };
  if (u.role === "SUPER_ADMIN" && u.isActive && (await superAdminCount()) <= 1) {
    return { error: "Harus ada minimal satu Super Admin." };
  }

  const me = session.user.id;
  try {
    await prisma.$transaction([
      prisma.announcement.updateMany({ where: { authorId: id }, data: { authorId: me } }),
      prisma.material.updateMany({ where: { uploadedBy: id }, data: { uploadedBy: me } }),
      prisma.album.updateMany({ where: { createdBy: id }, data: { createdBy: me } }),
      prisma.media.updateMany({ where: { uploadedBy: id }, data: { uploadedBy: me } }),
      prisma.comment.deleteMany({ where: { authorId: id } }),
      prisma.post.deleteMany({ where: { authorId: id } }),
      prisma.organizationMember.updateMany({ where: { userId: id }, data: { userId: null } }),
      prisma.user.delete({ where: { id } }),
    ]);
  } catch (e) {
    const err = e as { code?: string; message?: string };
    if (err.code === "P2003" || /foreign key/i.test(err.message ?? "")) {
      return { error: "Akun ini punya catatan kas kelas atau data lain, jadi tidak bisa dihapus. Nonaktifkan saja akunnya." };
    }
    throw e;
  }
  await deleteUpload(u.image);
  await audit(me, "user.delete", "User", id);
  refresh();
}
