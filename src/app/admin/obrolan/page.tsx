import Link from "next/link";
import { ArrowUpRight, MessagesSquare, Pencil, Plus, Trash2, Users } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";
import AdminHeader from "@/components/admin/AdminHeader";
import MemberPicker from "@/components/admin/MemberPicker";
import GroupAvatar from "@/components/chat/GroupAvatar";
import FormDialog from "@/components/ui/FormDialog";
import ConfirmButton from "@/components/ui/ConfirmButton";
import { Check, Field, TextArea, TextInput } from "@/components/ui/Fields";
import { Avatar, EmptyState } from "@/components/ui/bits";
import { relativeTime } from "@/lib/format";
import { ROLE_NAME, type RoleKey } from "@/lib/roles";
import { btn, card, cx } from "@/lib/ui";
import { createGroup, deleteGroup, updateGroup } from "./actions";

export const metadata = { title: "Grup Obrolan" };

function GroupFields({ g }: { g?: { title: string | null; description: string | null } }) {
  return (
    <>
      <Field label="Nama grup">
        <TextInput name="title" required maxLength={80} defaultValue={g?.title ?? ""} placeholder="Kelompok Basis Data" />
      </Field>
      <Field label="Deskripsi (opsional)">
        <TextArea name="description" rows={2} maxLength={500} defaultValue={g?.description ?? ""} />
      </Field>
    </>
  );
}

export default async function AdminGroupsPage() {
  const session = await requireAdmin();
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 86_400_000);

  const [groups, users, directCount, weekMessages] = await Promise.all([
    prisma.conversation.findMany({
      where: { type: "GROUP" },
      orderBy: { lastMessageAt: "desc" },
      select: {
        id: true,
        title: true,
        description: true,
        imageUrl: true,
        lastMessageAt: true,
        _count: { select: { messages: { where: { kind: "TEXT" } } } },
        members: {
          orderBy: { joinedAt: "asc" },
          select: { user: { select: { id: true, displayName: true, image: true } } },
        },
      },
    }),
    prisma.user.findMany({
      where: { isActive: true },
      orderBy: { displayName: "asc" },
      select: { id: true, displayName: true, image: true, role: true },
    }),
    prisma.conversation.count({ where: { type: "DIRECT" } }),
    prisma.message.count({ where: { kind: "TEXT", createdAt: { gte: weekAgo } } }),
  ]);

  const people = users.map((u) => ({
    id: u.id,
    name: u.id === session.user.id ? `${u.displayName} (kamu)` : u.displayName,
    image: u.image,
    role: ROLE_NAME[u.role as RoleKey] ?? "Anggota",
  }));
  const pickable = people.filter((p) => p.id !== session.user.id);

  return (
    <div>
      <AdminHeader
        title="Grup obrolan"
        description="Buat grup dan atur siapa saja anggotanya. Hanya anggota grup yang bisa membaca dan mengirim pesan. Chat pribadi antar anggota tidak bisa dibuka dari sini."
      >
        <FormDialog
          title="Grup baru"
          description="Anggota yang dipilih langsung bisa mengobrol di grup ini."
          trigger={
            <>
              <Plus size={18} /> Grup baru
            </>
          }
          action={createGroup}
          submitLabel="Buat grup"
          size="lg"
        >
          <GroupFields />
          <MemberPicker users={pickable} />
          <Check name="join" label="Saya ikut menjadi anggota grup ini" defaultChecked />
        </FormDialog>
      </AdminHeader>

      <dl className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {[
          { label: "Grup", value: groups.length },
          { label: "Chat pribadi", value: directCount },
          { label: "Pesan 7 hari", value: weekMessages },
        ].map((s) => (
          <div key={s.label} className={cx(card, "p-4")}>
            <dt className="text-sm text-muted">{s.label}</dt>
            <dd className="mt-1 text-2xl font-bold tabular-nums">{s.value}</dd>
          </div>
        ))}
      </dl>

      {groups.length === 0 ? (
        <EmptyState icon={<MessagesSquare size={32} />} title="Belum ada grup">
          Buat grup pertama, misalnya “Mibers Duo Anam” untuk seluruh kelas.
        </EmptyState>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {groups.map((g) => {
            const memberIds = g.members.map((m) => m.user.id);
            const isMember = memberIds.includes(session.user.id);
            return (
              <article key={g.id} className={cx(card, "flex flex-col p-5")}>
                <div className="flex items-start gap-3">
                  <GroupAvatar id={g.id} title={g.title ?? "Grup"} size={48} src={g.imageUrl} />
                  <div className="min-w-0 flex-1">
                    <h2 className="truncate text-base font-bold">{g.title}</h2>
                    <p className="text-sm text-muted">
                      {g.members.length} anggota · {g._count.messages} pesan
                    </p>
                  </div>
                </div>
                {g.description && <p className="prose-safe mt-3 line-clamp-2 text-sm text-muted">{g.description}</p>}

                <div className="mt-4 flex items-center">
                  <div className="flex -space-x-2">
                    {g.members.slice(0, 6).map((m) => (
                      <Avatar key={m.user.id} name={m.user.displayName} src={m.user.image} size={30} className="ring-2 ring-surface" />
                    ))}
                  </div>
                  {g.members.length > 6 && <span className="ml-2 text-xs text-muted">+{g.members.length - 6}</span>}
                </div>
                <p className="mt-3 text-xs text-faint">Aktif {relativeTime(g.lastMessageAt, now)}</p>

                <div className="mt-auto flex flex-wrap gap-2 border-t border-line pt-4">
                  <FormDialog
                    title={`Kelola “${g.title}”`}
                    trigger={
                      <>
                        <Pencil size={15} /> Kelola
                      </>
                    }
                    triggerClassName={btn.sm}
                    action={updateGroup.bind(null, g.id)}
                    submitLabel="Simpan"
                    size="lg"
                  >
                    <GroupFields g={g} />
                    <MemberPicker users={people} defaultSelected={memberIds} />
                  </FormDialog>
                  {isMember && (
                    <Link href={`/obrolan/${g.id}`} className={btn.sm}>
                      <ArrowUpRight size={15} /> Buka
                    </Link>
                  )}
                  <ConfirmButton
                    action={deleteGroup.bind(null, g.id)}
                    title="Hapus grup?"
                    description={`Grup “${g.title}” beserta seluruh pesannya akan dihapus permanen.`}
                    confirmLabel="Hapus grup"
                    ariaLabel="Hapus grup"
                    className={cx(btn.smDanger, "ml-auto")}
                  >
                    <Trash2 size={15} />
                  </ConfirmButton>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <p className="mt-6 flex items-center gap-2 text-sm text-faint">
        <Users size={15} /> Anggota bisa keluar sendiri dari grup. Untuk bergabung lagi, tambahkan lewat tombol Kelola.
      </p>
    </div>
  );
}
