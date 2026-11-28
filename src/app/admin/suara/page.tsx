import { AudioLines, Info } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/session";
import { SOUND_KINDS } from "@/lib/sound-kinds";
import AdminHeader from "@/components/admin/AdminHeader";
import { relativeTime } from "@/lib/format";
import { badge, card, cx } from "@/lib/ui";
import SoundRecorder from "./recorder";

export const metadata = { title: "Suara Notifikasi" };

export default async function SoundsPage() {
  await requireSuperAdmin();
  const rows = await prisma.notificationSound.findMany({ select: { kind: true, duration: true, updatedAt: true } });
  const saved = new Map(rows.map((r) => [r.kind, r]));
  const now = new Date();

  return (
    <div>
      <AdminHeader
        title="Suara notifikasi"
        description="Rekam bunyi untuk setiap kategori notifikasi. Suara dipakai untuk semua anggota saat notifikasi muncul di website."
      />

      <div className={cx(card, "mb-5 flex gap-3 p-4 text-sm text-muted")}>
        <Info size={18} className="mt-0.5 flex-none text-brand" />
        <p>
          Rekaman maksimal 3 detik. Jeda hening di awal dan akhir dipotong otomatis, dan volumenya disamakan. Notifikasi yang muncul saat website
          ditutup tetap memakai suara bawaan HP atau laptop, karena browser tidak mengizinkan suara khusus di sana. Anggota bisa mematikan suara di
          Akun saya → Notifikasi.
        </p>
      </div>

      <div className="grid gap-3">
        {SOUND_KINDS.map((k) => {
          const s = saved.get(k.kind);
          return (
            <section key={k.kind} className={cx(card, "grid gap-3 p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:p-5")}>
              <div className="flex min-w-0 gap-3">
                <span
                  className={cx(
                    "flex h-10 w-10 flex-none items-center justify-center rounded-full",
                    s ? "bg-brand/15 text-brand" : "bg-surface-2 text-faint"
                  )}
                >
                  <AudioLines size={19} />
                </span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-semibold">{k.label}</h2>
                    <span className={cx(badge, s ? "bg-brand/15 text-brand" : "bg-surface-2 text-faint")}>
                      {s ? `Rekaman · ${s.duration.toFixed(1)} dtk` : "Suara bawaan"}
                    </span>
                  </div>
                  <p className="text-sm text-muted">{k.hint}</p>
                  {s && <p className="text-xs text-faint">Diperbarui {relativeTime(s.updatedAt, now)}</p>}
                </div>
              </div>
              <SoundRecorder kind={k.kind} custom={!!s} />
            </section>
          );
        })}
      </div>
    </div>
  );
}
