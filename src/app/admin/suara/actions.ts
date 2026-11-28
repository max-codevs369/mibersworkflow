"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/session";
import { audit } from "@/lib/audit";
import { isSoundKind, MAX_SOUND_BYTES, MAX_SOUND_SECONDS } from "@/lib/sound-kinds";

type Result = { ok?: true; error?: string };

function wavDuration(buf: Buffer): number | null {
  if (buf.length < 44 || buf.toString("ascii", 0, 4) !== "RIFF" || buf.toString("ascii", 8, 12) !== "WAVE") return null;
  let pos = 12;
  let byteRate = 0;
  let valid = false;
  while (pos + 8 <= buf.length) {
    const id = buf.toString("ascii", pos, pos + 4);
    const size = buf.readUInt32LE(pos + 4);
    const body = pos + 8;
    if (id === "fmt ") {
      if (size < 16 || body + 16 > buf.length) return null;
      const format = buf.readUInt16LE(body);
      const channels = buf.readUInt16LE(body + 2);
      const rate = buf.readUInt32LE(body + 4);
      byteRate = buf.readUInt32LE(body + 8);
      const bits = buf.readUInt16LE(body + 14);
      valid = format === 1 && channels >= 1 && channels <= 2 && rate >= 8000 && rate <= 48000 && bits === 16;
    } else if (id === "data") {
      if (!valid || !byteRate || body + size > buf.length) return null;
      return size / byteRate;
    }
    pos = body + size + (size % 2);
  }
  return null;
}

export async function saveSound(formData: FormData): Promise<Result> {
  const session = await requireSuperAdmin();
  const kind = formData.get("kind");
  const file = formData.get("file");
  if (!isSoundKind(kind)) return { error: "Kategori suara tidak dikenal." };
  if (!(file instanceof File) || file.size === 0) return { error: "Rekaman kosong. Coba rekam lagi." };
  if (file.size > MAX_SOUND_BYTES) return { error: "Rekaman terlalu besar." };
  const data = Buffer.from(await file.arrayBuffer());
  const duration = wavDuration(data);
  if (duration === null) return { error: "Format rekaman tidak valid." };
  if (duration < 0.1 || duration > MAX_SOUND_SECONDS + 0.2) return { error: `Durasi rekaman harus 0,1–${MAX_SOUND_SECONDS} detik.` };

  await prisma.notificationSound.upsert({
    where: { kind },
    create: { kind, data, size: data.length, duration, updatedBy: session.user.id },
    update: { data, size: data.length, duration, updatedBy: session.user.id },
  });
  await audit(session.user.id, "sound.save", "NotificationSound", kind);
  revalidatePath("/admin/suara");
  return { ok: true };
}

export async function resetSound(kind: string): Promise<Result> {
  const session = await requireSuperAdmin();
  if (!isSoundKind(kind)) return { error: "Kategori suara tidak dikenal." };
  await prisma.notificationSound.deleteMany({ where: { kind } });
  await audit(session.user.id, "sound.reset", "NotificationSound", kind);
  revalidatePath("/admin/suara");
  return { ok: true };
}
