import { StickyNote as StickyIcon } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { readDeviceId } from "@/lib/device";
import { getSettings, flag } from "@/lib/settings";
import { isAdminRole } from "@/lib/roles";
import Reveal from "@/components/Reveal";
import PageHeader, { container } from "@/components/PageHeader";
import NoteCard from "@/components/notes/NoteCard";
import NoteComposer from "@/components/notes/NoteComposer";
import ReactionBar from "@/components/notes/ReactionBar";
import { EmptyState } from "@/components/ui/bits";
import { TYPE_LABEL, noteVisibleWhere, type NoteTypeKey } from "@/lib/notes";
import { cx } from "@/lib/ui";
import FilterBar from "@/components/ui/FilterBar";
import { cleanQuery } from "@/lib/filters";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Dinding Catatan",
  description: "Dinding catatan kelas Mibers Duo Anam: pesan, kesan, dan semangat dari teman sekelas.",
  alternates: { canonical: "/dinding" },
  openGraph: { title: "Dinding Catatan", description: "Dinding catatan kelas Mibers Duo Anam: pesan, kesan, dan semangat dari teman sekelas.", url: "/dinding" },
};

export default async function WallPage({
  searchParams,
}: {
  searchParams: Promise<{ tipe?: string; kategori?: string; q?: string }>;
}) {
  const sp = await searchParams;
  const raw = sp.kategori ?? sp.tipe;
  const tipe = typeof raw === "string" && Object.hasOwn(TYPE_LABEL, raw) ? (raw as NoteTypeKey) : null;
  const q = cleanQuery(sp.q);

  const [session, settings, deviceId] = await Promise.all([getSession(), getSettings(), readDeviceId()]);
  const who = isAdminRole(session?.user.role) ? "ADMIN" : session ? "MEMBER" : "GUEST";
  const guestBlocked = who === "GUEST" && !flag(settings.note_guest_enabled);

  const base = [noteVisibleWhere(), ...(q ? [{ content: { contains: q, mode: "insensitive" as const } }] : [])];
  const byType = await prisma.note.groupBy({ by: ["type"], where: { AND: base }, _count: { _all: true } });
  const notes = await prisma.note.findMany({
    where: {
      AND: [
        ...base,
        ...(tipe ? [{ type: tipe }] : []),
      ],
    },
    orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
    take: 80,
    include: { reactions: { select: { emoji: true, deviceId: true } } },
  });

  return (
    <>
      <PageHeader
        crumbs={[{ label: "Ruang bersama" }, { label: "Dinding catatan" }]}
        eyebrow={`${notes.length} catatan`}
        title="Dinding catatan"
        description="Tempel pesan, semangat, atau pengingat untuk seisi kelas. Tetap sopan, ya."
      >
        <NoteComposer who={who} disabled={guestBlocked} />
      </PageHeader>

      <section className={cx(container, "pt-6")}>
        <FilterBar
          path="/dinding"
          q={q}
          kategori={tipe}
          categories={(Object.keys(TYPE_LABEL) as NoteTypeKey[]).map((k) => ({ value: k, label: TYPE_LABEL[k], count: byType.find((g) => g.type === k)?._count._all ?? 0 }))}
          search={{ placeholder: "Cari isi catatan", label: "Cari catatan" }}
          total={notes.length}
          noun="catatan"
        />

        <div className="mt-8">
          {notes.length === 0 ? (
            <EmptyState
              icon={<StickyIcon size={30} />}
              title={q || tipe ? "Tidak ada catatan yang cocok" : "Belum ada catatan di sini"}
            >
              {q || tipe ? "Coba kata kunci atau kategori lain." : "Jadilah yang pertama menempel catatan."}
            </EmptyState>
          ) : (
            <div className="grid gap-x-4 gap-y-8 pt-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {notes.map((n, i) => {
                const counts: Record<string, number> = {};
                const mine: string[] = [];
                for (const r of n.reactions) {
                  counts[r.emoji] = (counts[r.emoji] ?? 0) + 1;
                  if (deviceId && r.deviceId === deviceId) mine.push(r.emoji);
                }
                return (
                  <Reveal key={n.id} delay={(i % 4) * 0.04}>
                    <NoteCard note={n}>
                      <ReactionBar noteId={n.id} counts={counts} mine={mine} />
                    </NoteCard>
                  </Reveal>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
