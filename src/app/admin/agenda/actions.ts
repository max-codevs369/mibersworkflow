"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";
import { audit } from "@/lib/audit";
import { notifyAll } from "@/lib/notify";
import { longDate, parseInputDateTime, timeOf } from "@/lib/format";
import type { ActionState } from "@/lib/ui";

const schema = z.object({
  title: z.string().trim().min(3, "Judul minimal 3 karakter.").max(120, "Judul terlalu panjang."),
  description: z.string().trim().max(2000, "Deskripsi terlalu panjang."),
  location: z.string().trim().max(120, "Lokasi terlalu panjang."),
  type: z.enum(["EXAM", "ACTIVITY", "BIRTHDAY", "HOLIDAY", "OTHER"]),
  startAt: z.string().min(1, "Isi waktu mulai."),
  endAt: z.string(),
});

function parse(fd: FormData) {
  const r = schema.safeParse({
    title: fd.get("title"),
    description: fd.get("description") ?? "",
    location: fd.get("location") ?? "",
    type: fd.get("type"),
    startAt: fd.get("startAt") ?? "",
    endAt: fd.get("endAt") ?? "",
  });
  if (!r.success) return { error: r.error.issues[0].message } as const;
  const startAt = parseInputDateTime(r.data.startAt);
  if (!startAt) return { error: "Waktu mulai tidak valid." } as const;
  const endAt = parseInputDateTime(r.data.endAt);
  if (r.data.endAt && !endAt) return { error: "Waktu selesai tidak valid." } as const;
  if (endAt && endAt < startAt) return { error: "Waktu selesai harus setelah waktu mulai." } as const;
  return {
    data: {
      title: r.data.title,
      description: r.data.description || null,
      location: r.data.location || null,
      type: r.data.type,
      startAt,
      endAt,
    },
  } as const;
}

function refresh() {
  revalidatePath("/");
  revalidatePath("/agenda");
  revalidatePath("/admin", "layout");
}

export async function createEvent(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const session = await requireAdmin();
  const p = parse(fd);
  if ("error" in p) return { error: p.error };
  const e = await prisma.event.create({ data: p.data });
  await audit(session.user.id, "event.create", "Event", e.id);
  if ((e.endAt ?? e.startAt) > new Date()) {
    await notifyAll({
      exceptUserId: session.user.id,
      type: "event",
      message: `Agenda baru: ${e.title} · ${longDate(e.startAt)} jam ${timeOf(e.startAt)}${e.location ? ` di ${e.location}` : ""}`,
      link: "/agenda",
    });
  }
  refresh();
  return { ok: true, message: "Acara ditambahkan. Semua anggota sudah diberi tahu." };
}

export async function updateEvent(id: string, _prev: ActionState, fd: FormData): Promise<ActionState> {
  const session = await requireAdmin();
  const p = parse(fd);
  if ("error" in p) return { error: p.error };
  const before = await prisma.event.findUnique({ where: { id }, select: { startAt: true, location: true, title: true } });
  if (!before) return { error: "Acara sudah dihapus." };
  const moved = before.startAt.getTime() !== p.data.startAt.getTime();
  const relocated = (before.location ?? "") !== (p.data.location ?? "");

  await prisma.event.update({ where: { id }, data: { ...p.data, ...(moved ? { remindedAt: null } : {}) } });
  await audit(session.user.id, "event.update", "Event", id);
  if ((moved || relocated) && p.data.startAt > new Date()) {
    const what = [moved && `${longDate(p.data.startAt)} jam ${timeOf(p.data.startAt)}`, relocated && (p.data.location ? `di ${p.data.location}` : "lokasi berubah")]
      .filter(Boolean)
      .join(", ");
    await notifyAll({
      exceptUserId: session.user.id,
      type: "event",
      message: `Agenda berubah: ${p.data.title} jadi ${what}`,
      link: "/agenda",
    });
  }
  refresh();
  return { ok: true, message: moved || relocated ? "Acara diperbarui. Anggota diberi tahu perubahannya." : "Acara diperbarui." };
}

export async function deleteEvent(id: string) {
  const session = await requireAdmin();
  await prisma.event.deleteMany({ where: { id } });
  await audit(session.user.id, "event.delete", "Event", id);
  refresh();
}
