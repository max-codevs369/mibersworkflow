import { ShieldOff, X } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";
import AdminHeader from "@/components/admin/AdminHeader";
import ActionForm from "@/components/ui/ActionForm";
import ConfirmButton from "@/components/ui/ConfirmButton";
import { Field, TextArea } from "@/components/ui/Fields";
import { longDateTime } from "@/lib/format";
import { btn, card, cx } from "@/lib/ui";
import { addBannedWords, deleteBannedWord, unblockDevice } from "../actions";

export const metadata = { title: "Filter & Blokir" };

export default async function WallFilterPage() {
  await requireAdmin();
  const [words, blocked] = await Promise.all([
    prisma.bannedWord.findMany({ orderBy: { word: "asc" } }),
    prisma.blockedDevice.findMany({ orderBy: { createdAt: "desc" } }),
  ]);

  return (
    <div>
      <AdminHeader
        title="Filter & blokir"
        description="Kata terlarang berlaku untuk dinding catatan dan ruang obrolan."
        back={{ href: "/admin/dinding", label: "Dinding catatan" }}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <section className={cx(card, "p-5 sm:p-6")}>
          <h2 className="text-lg font-bold">Kata terlarang</h2>
          <p className="mt-1 text-sm text-muted">Tulisan yang memuat kata ini akan ditolak otomatis.</p>
          <div className="mt-5">
            <ActionForm action={addBannedWords} submitLabel="Tambahkan" resetOnSuccess>
              <Field label="Kata baru" hint="Pisahkan dengan koma atau baris baru.">
                <TextArea name="words" rows={3} placeholder="kata1, kata2" />
              </Field>
            </ActionForm>
          </div>
          <div className="mt-6 flex flex-wrap gap-2">
            {words.length === 0 && <p className="text-sm text-faint">Belum ada kata terlarang.</p>}
            {words.map((w) => (
              <span key={w.id} className="inline-flex items-center gap-1 rounded-full bg-surface-2 py-1 pl-3 pr-1 text-sm">
                {w.word}
                <ConfirmButton
                  action={deleteBannedWord.bind(null, w.id)}
                  skipConfirm
                  ariaLabel={`Hapus ${w.word}`}
                  className="flex h-7 w-7 items-center justify-center rounded-full text-faint hover:bg-danger hover:text-ink"
                >
                  <X size={13} />
                </ConfirmButton>
              </span>
            ))}
          </div>
        </section>

        <section className={cx(card, "p-5 sm:p-6")}>
          <h2 className="text-lg font-bold">Perangkat diblokir</h2>
          <p className="mt-1 text-sm text-muted">Pengirim tamu yang diblokir dari halaman moderasi.</p>
          <ul className="mt-5 grid gap-2">
            {blocked.length === 0 && <li className="text-sm text-faint">Tidak ada perangkat yang diblokir.</li>}
            {blocked.map((b) => (
              <li key={b.id} className="flex items-center justify-between gap-3 rounded-xl bg-surface-2 px-4 py-3">
                <div className="min-w-0 text-sm">
                  <p className="truncate font-mono text-xs text-muted">
                    {b.deviceId ? `perangkat ${b.deviceId.slice(0, 8)}…` : ""} {b.ipHash ? `jaringan ${b.ipHash.slice(0, 8)}…` : ""}
                  </p>
                  <p className="text-xs text-faint">
                    {b.reason ?? "Diblokir"} · {longDateTime(b.createdAt)}
                  </p>
                </div>
                <ConfirmButton
                  action={unblockDevice.bind(null, b.id)}
                  title="Buka blokir?"
                  description="Perangkat ini bisa menempel catatan lagi."
                  confirmLabel="Buka blokir"
                  tone="primary"
                  className={btn.sm}
                >
                  <ShieldOff size={15} /> Buka
                </ConfirmButton>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
