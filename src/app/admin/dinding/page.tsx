import Link from "next/link";
import { Check, EyeOff, Pin, PinOff, ShieldBan, Trash2, Undo2, X, Flag, Filter, StickyNote, CheckCheck } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";
import AdminHeader, { FilterTabs } from "@/components/admin/AdminHeader";
import ConfirmButton from "@/components/ui/ConfirmButton";
import { EmptyState } from "@/components/ui/bits";
import { relativeTime, longDateTime } from "@/lib/format";
import { NOTE_TONE, ROLE_LABEL, TYPE_LABEL, type NoteTypeKey } from "@/lib/notes";
import { badge, btn, card, cx, readableTone } from "@/lib/ui";
import {
  setNoteStatus,
  togglePin,
  deleteNote,
  blockSender,
  dismissReports,
  bulkApprovePending,
} from "./actions";

export const metadata = { title: "Dinding Catatan" };

const TABS = [
  { key: "PENDING", label: "Menunggu" },
  { key: "REPORTED", label: "Dilaporkan" },
  { key: "APPROVED", label: "Tayang" },
  { key: "HIDDEN", label: "Disembunyikan" },
  { key: "REJECTED", label: "Ditolak" },
] as const;
type TabKey = (typeof TABS)[number]["key"];

export default async function AdminWallPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  await requireAdmin();
  const sp = await searchParams;
  const tab: TabKey = TABS.find((t) => t.key === sp.status)?.key ?? "PENDING";
  const now = new Date();

  const where =
    tab === "REPORTED" ? { status: "APPROVED" as const, reports: { some: {} } } : { status: tab };

  const [notes, grouped, reportedCount] = await Promise.all([
    prisma.note.findMany({
      where,
      orderBy: tab === "APPROVED" ? [{ isPinned: "desc" }, { createdAt: "desc" }] : { createdAt: "desc" },
      take: 100,
      include: {
        _count: { select: { reports: true, reactions: true } },
        reports: { select: { reason: true }, take: 3, orderBy: { createdAt: "desc" } },
        moderatedBy: { select: { displayName: true } },
        author: { select: { displayName: true } },
      },
    }),
    prisma.note.groupBy({ by: ["status"], _count: true }),
    prisma.note.count({ where: { status: "APPROVED", reports: { some: {} } } }),
  ]);
  const count = (k: string) => (k === "REPORTED" ? reportedCount : grouped.find((g) => g.status === k)?._count ?? 0);

  return (
    <div>
      <AdminHeader title="Dinding catatan" description="Setujui, sembunyikan, atau hapus catatan dari tamu dan anggota.">
        <Link href="/admin/dinding/filter" className={btn.secondary}>
          <Filter size={17} /> Filter & blokir
        </Link>
        {tab === "PENDING" && notes.length > 1 && (
          <ConfirmButton
            action={bulkApprovePending}
            title={`Setujui ${notes.length} catatan sekaligus?`}
            description="Pastikan kamu sudah membaca semuanya."
            confirmLabel="Setujui semua"
            tone="primary"
            className={btn.primary}
          >
            <CheckCheck size={17} /> Setujui semua
          </ConfirmButton>
        )}
      </AdminHeader>

      <FilterTabs
        active={tab}
        tabs={TABS.map((t) => ({ key: t.key, label: t.label, count: count(t.key), href: `/admin/dinding?status=${t.key}` }))}
      />

      {notes.length === 0 ? (
        <EmptyState icon={<StickyNote size={32} />} title="Kosong">
          {tab === "PENDING" ? "Tidak ada catatan yang menunggu persetujuan." : "Tidak ada catatan di kategori ini."}
        </EmptyState>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {notes.map((n) => (
            <article key={n.id} className={cx(card, "flex flex-col overflow-hidden")}>
              <div className="relative border-b border-line px-5 pb-4 pt-4">
                <span aria-hidden className="absolute inset-y-4 left-0 w-[3px] rounded-r" style={{ background: NOTE_TONE[n.color] }} />
                <div className="flex items-center justify-between font-mono text-[11px] uppercase tracking-wider">
                  <span style={{ color: readableTone(NOTE_TONE[n.color]) }}>{TYPE_LABEL[n.type as NoteTypeKey]}</span>
                  {n.isPinned && <span className="text-muted">Disematkan</span>}
                </div>
                <p className="prose-safe mt-2 whitespace-pre-line text-[15px] leading-relaxed text-fg">{n.content}</p>
              </div>
              <div className="flex flex-1 flex-col gap-3 p-4">
                <div className="flex flex-wrap items-center gap-1.5 text-sm">
                  <span className="font-semibold">
                    {n.isAnonymous ? "Anonim" : n.authorName}
                    {n.isAnonymous && n.author && <span className="font-normal text-faint"> ({n.author.displayName})</span>}
                  </span>
                  <span className={cx(badge, n.authorKind === "GUEST" ? "bg-surface-3 text-muted" : "bg-brand/15 text-brand")}>
                    {ROLE_LABEL[n.authorKind].toUpperCase()}
                  </span>
                  <span className="text-faint" title={longDateTime(n.createdAt)}>
                    · {relativeTime(n.createdAt, now)}
                  </span>
                </div>
                {n._count.reports > 0 && (
                  <div className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
                    <p className="flex items-center gap-1.5 font-semibold">
                      <Flag size={14} /> {n._count.reports} laporan
                    </p>
                    {n.reports.filter((r) => r.reason).map((r, i) => (
                      <p key={i} className="mt-0.5 text-xs">“{r.reason}”</p>
                    ))}
                  </div>
                )}
                {n.moderatedBy && tab !== "PENDING" && (
                  <p className="text-xs text-faint">Dimoderasi oleh {n.moderatedBy.displayName}</p>
                )}

                <div className="mt-auto flex flex-wrap gap-1.5 border-t border-line pt-3">
                  {(tab === "PENDING" || tab === "REJECTED" || tab === "HIDDEN") && (
                    <ConfirmButton action={setNoteStatus.bind(null, n.id, "APPROVED")} skipConfirm className={btn.smPrimary}>
                      <Check size={15} /> {tab === "PENDING" ? "Setujui" : "Tayangkan"}
                    </ConfirmButton>
                  )}
                  {tab === "PENDING" && (
                    <ConfirmButton action={setNoteStatus.bind(null, n.id, "REJECTED")} skipConfirm className={btn.sm}>
                      <X size={15} /> Tolak
                    </ConfirmButton>
                  )}
                  {tab === "REPORTED" && (
                    <ConfirmButton action={dismissReports.bind(null, n.id)} skipConfirm className={btn.sm}>
                      <Undo2 size={15} /> Abaikan laporan
                    </ConfirmButton>
                  )}
                  {(tab === "APPROVED" || tab === "REPORTED") && (
                    <>
                      <ConfirmButton action={togglePin.bind(null, n.id)} skipConfirm className={btn.sm}>
                        {n.isPinned ? <PinOff size={15} /> : <Pin size={15} />}
                        {n.isPinned ? "Lepas" : "Sematkan"}
                      </ConfirmButton>
                      <ConfirmButton action={setNoteStatus.bind(null, n.id, "HIDDEN")} skipConfirm className={btn.sm}>
                        <EyeOff size={15} /> Sembunyikan
                      </ConfirmButton>
                    </>
                  )}
                  {n.authorKind === "GUEST" && tab !== "REJECTED" && (
                    <ConfirmButton
                      action={blockSender.bind(null, n.id)}
                      title="Blokir pengirim ini?"
                      description="Perangkat dan jaringan pengirim tidak bisa menempel catatan lagi. Catatan tamu lain dari sumber yang sama ikut ditolak. Orang lain di Wi-Fi yang sama bisa ikut terblokir."
                      confirmLabel="Blokir"
                      className={btn.smDanger}
                    >
                      <ShieldBan size={15} /> Blokir
                    </ConfirmButton>
                  )}
                  <ConfirmButton
                    action={deleteNote.bind(null, n.id)}
                    title="Hapus permanen?"
                    description="Catatan beserta reaksinya akan hilang dan tidak bisa dikembalikan."
                    confirmLabel="Hapus"
                    className={cx(btn.smDanger, "ml-auto")}
                    ariaLabel="Hapus catatan"
                  >
                    <Trash2 size={15} />
                  </ConfirmButton>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
