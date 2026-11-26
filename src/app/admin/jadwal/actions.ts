"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";
import { audit } from "@/lib/audit";
import { WEEKDAYS, isValidDateKey } from "@/lib/format";
import type { ActionState } from "@/lib/ui";
import { notifyAll } from "@/lib/notify";

const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Format jam harus JJ:MM, misalnya 07:30.");

const schema = z.object({
  day: z.enum(WEEKDAYS),
  startTime: time,
  endTime: time,
  subject: z.string().trim().min(2, "Isi nama mata kuliah.").max(80, "Nama mata kuliah terlalu panjang."),
  teacher: z.string().trim().max(80, "Nama dosen terlalu panjang."),
  room: z.string().trim().max(40, "Ruangan terlalu panjang."),
});

async function parse(fd: FormData) {
  const semesterId = String(fd.get("semesterId") ?? "");
  const semester = semesterId ? await prisma.semester.findUnique({ where: { id: semesterId }, select: { id: true } }) : null;
  if (!semester) return { error: "Semester tidak ditemukan. Muat ulang halaman lalu coba lagi." } as const;
  const r = schema.safeParse({
    day: fd.get("day"),
    startTime: fd.get("startTime"),
    endTime: fd.get("endTime"),
    subject: fd.get("subject"),
    teacher: fd.get("teacher") ?? "",
    room: fd.get("room") ?? "",
  });
  if (!r.success) return { error: r.error.issues[0].message } as const;
  if (r.data.endTime <= r.data.startTime) return { error: "Jam selesai harus setelah jam mulai." } as const;
  return { data: { ...r.data, semesterId: semester.id, teacher: r.data.teacher || null, room: r.data.room || null } } as const;
}

async function notifyScheduleChanged(actorId: string) {
  const key = "schedule_notified_at";
  const now = Date.now();
  const row = await prisma.siteSetting.findUnique({ where: { key } });
  if (row && now - Number(row.value) < 30 * 60_000) return;
  await prisma.siteSetting.upsert({ where: { key }, update: { value: String(now) }, create: { key, value: String(now) } });
  await notifyAll({ exceptUserId: actorId, type: "event", message: "Jadwal kuliah diperbarui. Cek jadwal terbaru biar nggak salah masuk kelas.", link: "/agenda" });
}

function refresh() {
  revalidatePath("/");
  revalidatePath("/agenda");
  revalidatePath("/agenda/piket");
  revalidatePath("/admin/jadwal");
  revalidatePath("/akun");
  revalidatePath("/materi");
}

const optDate = z
  .string()
  .trim()
  .refine((v) => v === "" || isValidDateKey(v), "Tanggal tidak valid.");

const semesterSchema = z.object({
  number: z.coerce.number().int("Nomor semester harus angka bulat.").min(1, "Nomor semester minimal 1.").max(14, "Nomor semester maksimal 14."),
  name: z.string().trim().max(40, "Nama semester terlalu panjang."),
  startDate: optDate,
  endDate: optDate,
});

function parseSemester(fd: FormData) {
  const r = semesterSchema.safeParse({
    number: fd.get("number"),
    name: fd.get("name") ?? "",
    startDate: fd.get("startDate") ?? "",
    endDate: fd.get("endDate") ?? "",
  });
  if (!r.success) return { error: r.error.issues[0].message } as const;
  const { number, name, startDate, endDate } = r.data;
  if (startDate && endDate && endDate < startDate) return { error: "Tanggal selesai harus setelah tanggal mulai." } as const;
  return { data: { number, name: name || `Semester ${number}`, startDate: startDate || null, endDate: endDate || null } } as const;
}

async function overlapError(data: { startDate: string | null; endDate: string | null }, exceptId?: string) {
  if (!data.startDate || !data.endDate) return null;
  const others = await prisma.semester.findMany({
    where: { id: exceptId ? { not: exceptId } : undefined, startDate: { not: null }, endDate: { not: null } },
    select: { name: true, startDate: true, endDate: true },
  });
  const clash = others.find((o) => o.startDate! <= data.endDate! && o.endDate! >= data.startDate!);
  return clash ? `Rentang tanggal bertabrakan dengan ${clash.name}.` : null;
}

export async function createSemester(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const session = await requireAdmin();
  const p = parseSemester(fd);
  if ("error" in p) return { error: p.error };
  if (await prisma.semester.findUnique({ where: { number: p.data.number } })) return { error: `Semester ${p.data.number} sudah ada.` };
  const clash = await overlapError(p.data);
  if (clash) return { error: clash };
  const hasActive = await prisma.semester.count({ where: { isActive: true } });
  const s = await prisma.semester.create({ data: { ...p.data, isActive: hasActive === 0 } });
  await audit(session.user.id, "semester.create", "Semester", s.id);
  refresh();
  return { ok: true, message: `${s.name} ditambahkan.` };
}

export async function updateSemester(id: string, _prev: ActionState, fd: FormData): Promise<ActionState> {
  const session = await requireAdmin();
  const p = parseSemester(fd);
  if ("error" in p) return { error: p.error };
  const dup = await prisma.semester.findUnique({ where: { number: p.data.number }, select: { id: true } });
  if (dup && dup.id !== id) return { error: `Semester ${p.data.number} sudah ada.` };
  const clash = await overlapError(p.data, id);
  if (clash) return { error: clash };
  const res = await prisma.semester.updateMany({ where: { id }, data: p.data });
  if (!res.count) return { error: "Semester sudah dihapus." };
  await audit(session.user.id, "semester.update", "Semester", id);
  refresh();
  return { ok: true, message: "Semester disimpan." };
}

export async function activateSemester(id: string) {
  const session = await requireAdmin();
  const exists = await prisma.semester.findUnique({ where: { id }, select: { id: true, name: true } });
  if (!exists) return;
  await prisma.$transaction([
    prisma.semester.updateMany({ where: { isActive: true }, data: { isActive: false } }),
    prisma.semester.update({ where: { id }, data: { isActive: true } }),
  ]);
  await audit(session.user.id, "semester.activate", "Semester", id);
  await notifyAll({
    exceptUserId: session.user.id,
    type: "event",
    message: `${exists.name} sekarang aktif. Cek jadwal kuliah terbaru di Agenda.`,
    link: "/agenda#jadwal",
  });
  refresh();
}

export async function deleteSemester(id: string) {
  const session = await requireAdmin();
  const s = await prisma.semester.findUnique({ where: { id }, select: { isActive: true } });
  if (!s || s.isActive) return;
  await prisma.semester.delete({ where: { id } });
  await audit(session.user.id, "semester.delete", "Semester", id);
  refresh();
}

export async function createSchedule(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const session = await requireAdmin();
  const p = await parse(fd);
  if ("error" in p) return { error: p.error };
  const s = await prisma.schedule.create({ data: p.data });
  await audit(session.user.id, "schedule.create", "Schedule", s.id);
  await notifyScheduleChanged(session.user.id);
  refresh();
  return { ok: true };
}

export async function updateSchedule(id: string, _prev: ActionState, fd: FormData): Promise<ActionState> {
  const session = await requireAdmin();
  const p = await parse(fd);
  if ("error" in p) return { error: p.error };
  const res = await prisma.schedule.updateMany({ where: { id }, data: p.data });
  if (!res.count) return { error: "Jadwal sudah dihapus." };
  await audit(session.user.id, "schedule.update", "Schedule", id);
  await notifyScheduleChanged(session.user.id);
  refresh();
  return { ok: true };
}

export async function deleteSchedule(id: string) {
  const session = await requireAdmin();
  const del = await prisma.schedule.deleteMany({ where: { id } });
  await audit(session.user.id, "schedule.delete", "Schedule", id);
  if (del.count) await notifyScheduleChanged(session.user.id);
  refresh();
}

export async function savePiketStart(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const session = await requireAdmin();
  const date = String(fd.get("startDate") ?? "").trim();
  const absen = Math.floor(Number(fd.get("startAbsen")));
  if (!isValidDateKey(date)) {
    return { error: "Tanggal mulai tidak valid." };
  }
  if (!Number.isFinite(absen) || absen < 1 || absen > 999) return { error: "Nomor absen harus antara 1 dan 999." };

  await prisma.$transaction(
    [
      ["piket_start_date", date],
      ["piket_start_absen", String(absen)],
    ].map(([key, value]) => prisma.siteSetting.upsert({ where: { key }, update: { value }, create: { key, value } }))
  );
  await audit(session.user.id, "piket.update", "Piket", `mulai ${date} absen ${absen}`);
  refresh();
  return { ok: true, message: "Titik mulai piket disimpan." };
}

const normName = (v: string) => v.toLowerCase().replace(/[^a-z0-9]/g, "");

export async function importRoster(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const session = await requireAdmin();
  const text = String(fd.get("roster") ?? "");
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  if (!lines.length) return { error: "Tempel daftar absen dulu, satu nama per baris." };
  if (lines.length > 200) return { error: "Maksimal 200 nama." };

  const rows: { no: number; name: string }[] = [];
  for (const [i, line] of lines.entries()) {
    const m = line.match(/^(\d{1,3})\s*(?:[.)\-:]\s*|\s+)(.+)$/);
    const no = m ? Number(m[1]) : i + 1;
    const name = (m ? m[2] : line).trim().slice(0, 80);
    if (name.length < 2) return { error: `Baris ${i + 1} tidak berisi nama.` };
    if (no < 1 || no > 999) return { error: `Nomor absen di baris ${i + 1} tidak valid.` };
    if (rows.some((r) => r.no === no)) return { error: `Nomor absen ${no} muncul dua kali.` };
    rows.push({ no, name });
  }

  const [existing, users] = await Promise.all([
    prisma.rosterEntry.findMany({ select: { name: true, userId: true } }),
    prisma.user.findMany({ where: { isActive: true }, select: { id: true, name: true } }),
  ]);
  const keepLink = new Map(existing.filter((e) => e.userId).map((e) => [normName(e.name), e.userId!]));
  const used = new Set<string>();
  const data = rows
    .sort((a, b) => a.no - b.no)
    .map((r) => {
      const key = normName(r.name);
      let userId = keepLink.get(key) ?? users.find((u) => normName(u.name) === key)?.id ?? null;
      if (userId && used.has(userId)) userId = null;
      if (userId) used.add(userId);
      return { absenNo: r.no, name: r.name, userId };
    });

  await prisma.$transaction([prisma.rosterEntry.deleteMany({}), prisma.rosterEntry.createMany({ data })]);
  await audit(session.user.id, "piket.update", "Piket", `daftar absen ${data.length} orang`);
  refresh();
  revalidatePath("/agenda/piket");
  return { ok: true, message: `Daftar absen ${data.length} orang disimpan. ${used.size} tertaut ke akun.` };
}

export async function saveRoster(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const session = await requireAdmin();
  const [entries, users] = await Promise.all([
    prisma.rosterEntry.findMany({ select: { id: true, absenNo: true } }),
    prisma.user.findMany({ where: { isActive: true }, select: { id: true } }),
  ]);
  const validUser = new Set(users.map((u) => u.id));
  const used = new Map<string, number>();
  const updates: { id: string; name: string; userId: string | null }[] = [];

  for (const e of entries) {
    const name = String(fd.get(`name_${e.id}`) ?? "").trim().slice(0, 80);
    const rawUser = String(fd.get(`user_${e.id}`) ?? "");
    if (name.length < 2) return { error: `Nama untuk absen ${e.absenNo} masih kosong.` };
    const userId = rawUser && validUser.has(rawUser) ? rawUser : null;
    if (userId) {
      const other = used.get(userId);
      if (other) return { error: `Satu akun ditautkan ke absen ${other} dan ${e.absenNo}.` };
      used.set(userId, e.absenNo);
    }
    updates.push({ id: e.id, name, userId });
  }

  await prisma.$transaction([
    prisma.rosterEntry.updateMany({ data: { userId: null } }),
    ...updates.map((u) => prisma.rosterEntry.update({ where: { id: u.id }, data: { name: u.name, userId: u.userId } })),
  ]);
  await audit(session.user.id, "piket.update", "Piket", "ubah daftar absen");
  refresh();
  revalidatePath("/agenda/piket");
  return { ok: true, message: "Daftar absen disimpan." };
}
