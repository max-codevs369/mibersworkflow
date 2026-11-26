import { KeyRound, Pencil, Power, Trash2, UserPlus, Users } from "lucide-react";
import PasswordInput from "@/components/ui/PasswordInput";
import LiveSearch from "@/components/ui/LiveSearch";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/session";
import type { Prisma } from "@/generated/prisma/client";
import AdminHeader, { FilterTabs } from "@/components/admin/AdminHeader";
import FormDialog from "@/components/ui/FormDialog";
import ConfirmButton from "@/components/ui/ConfirmButton";
import { Field, Row, SelectInput, TextArea, TextInput } from "@/components/ui/Fields";
import { Avatar, EmptyState } from "@/components/ui/bits";
import { ROLE_NAME, type RoleKey } from "@/lib/roles";
import { shortDate } from "@/lib/format";
import { badge, btn, card, cx } from "@/lib/ui";
import { bulkCreateUsers, createUser, deleteUser, resetPassword, toggleActive, updateUser } from "./actions";

export const metadata = { title: "Pengguna" };

const ROLE_TONE: Record<RoleKey, string> = {
  SUPER_ADMIN: "bg-brand text-ink",
  ADMIN: "bg-brand/15 text-brand",
  MEMBER: "bg-surface-3 text-muted",
};
const roleOptions = (["MEMBER", "ADMIN", "SUPER_ADMIN"] as RoleKey[]).map((r) => ({ value: r, label: ROLE_NAME[r] }));

export default async function UsersPage({ searchParams }: { searchParams: Promise<{ q?: string; peran?: string }> }) {
  const session = await requireSuperAdmin();
  const sp = await searchParams;
  const q = (sp.q ?? "").trim().slice(0, 80);
  const peran = ["MEMBER", "ADMIN", "SUPER_ADMIN", "NONAKTIF"].includes(sp.peran ?? "") ? sp.peran! : "ALL";

  const where: Prisma.UserWhereInput = {
    ...(peran === "NONAKTIF" ? { isActive: false } : peran !== "ALL" ? { role: peran as RoleKey } : {}),
    ...(q
      ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { email: { contains: q, mode: "insensitive" } }] }
      : {}),
  };

  const [users, grouped, inactive] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: [{ isActive: "desc" }, { role: "asc" }, { name: "asc" }],
      include: { sessions: { orderBy: { updatedAt: "desc" }, take: 1, select: { updatedAt: true } } },
    }),
    prisma.user.groupBy({ by: ["role"], _count: true }),
    prisma.user.count({ where: { isActive: false } }),
  ]);
  const count = (r: string) => grouped.find((g) => g.role === r)?._count ?? 0;
  const total = grouped.reduce((s, g) => s + g._count, 0);
  const tab = (key: string) => {
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    if (key !== "ALL") p.set("peran", key);
    const s = p.toString();
    return `/admin/pengguna${s ? `?${s}` : ""}`;
  };

  return (
    <div>
      <AdminHeader
        title="Pengguna"
        description="Buat akun anggota, atur peran admin, dan kelola akses. Pendaftaran mandiri dimatikan."
      >
        <FormDialog
          title="Tambah banyak akun"
          description="Satu baris satu anggota: Nama, email. Semua memakai kata sandi awal yang sama."
          trigger={
            <>
              <Users size={18} /> Tambah banyak
            </>
          }
          triggerClassName={btn.secondary}
          action={bulkCreateUsers}
          submitLabel="Buat akun"
          size="lg"
        >
          <Field label="Daftar anggota" hint="Pemisah boleh koma, titik koma, atau tab (bisa tempel dari Excel).">
            <TextArea
              name="lines"
              rows={10}
              required
              placeholder={"Andi Pratama, andi@email.com\nBunga Lestari, bunga@email.com"}
              className="font-mono text-sm"
            />
          </Field>
          <Field label="Kata sandi awal" hint="Minta anggota menggantinya setelah masuk pertama kali.">
            <PasswordInput name="password" required minLength={8} maxLength={128} autoComplete="new-password" />
          </Field>
        </FormDialog>
        <FormDialog
          title="Akun baru"
          trigger={
            <>
              <UserPlus size={18} /> Akun baru
            </>
          }
          action={createUser}
        >
          <Field label="Nama lengkap">
            <TextInput name="name" required maxLength={80} />
          </Field>
          <Field label="Email">
            <TextInput name="email" type="email" required maxLength={120} autoComplete="off" />
          </Field>
          <Row>
            <Field label="Kata sandi awal" hint="Minimal 8 karakter.">
              <PasswordInput name="password" required minLength={8} maxLength={128} autoComplete="new-password" />
            </Field>
            <Field label="Peran">
              <SelectInput name="role" defaultValue="MEMBER" options={roleOptions} />
            </Field>
          </Row>
        </FormDialog>
      </AdminHeader>

      <LiveSearch defaultValue={q} placeholder="Cari nama atau email" label="Cari pengguna" className="mb-4" />

      <FilterTabs
        active={peran}
        tabs={[
          { key: "ALL", label: "Semua", count: total, href: tab("ALL") },
          { key: "MEMBER", label: "Anggota", count: count("MEMBER"), href: tab("MEMBER") },
          { key: "ADMIN", label: "Admin", count: count("ADMIN"), href: tab("ADMIN") },
          { key: "SUPER_ADMIN", label: "Super Admin", count: count("SUPER_ADMIN"), href: tab("SUPER_ADMIN") },
          { key: "NONAKTIF", label: "Nonaktif", count: inactive, href: tab("NONAKTIF") },
        ]}
      />

      {users.length === 0 ? (
        <EmptyState icon={<Users size={32} />} title="Tidak ada akun yang cocok" />
      ) : (
        <div className={cx(card, "divide-y divide-line")}>
          {users.map((u) => {
            const me = u.id === session.user.id;
            const r = u.role as RoleKey;
            return (
              <div key={u.id} className={cx("flex flex-col gap-3 p-4 sm:flex-row sm:items-center", !u.isActive && "opacity-55")}>
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <Avatar name={u.name} src={u.image} size={40} />
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-1.5 font-semibold">
                      <span className="truncate">{u.name}</span>
                      {me && <span className="text-xs font-normal text-faint">(kamu)</span>}
                      <span className={cx(badge, ROLE_TONE[r])}>{ROLE_NAME[r].toUpperCase()}</span>
                      {!u.isActive && <span className={cx(badge, "bg-danger/15 text-danger")}>NONAKTIF</span>}
                    </p>
                    <p className="truncate text-sm text-muted">{u.email}</p>
                    <p className="text-xs text-faint">
                      Dibuat {shortDate(u.createdAt)}
                      {u.sessions[0] ? ` · terakhir aktif ${shortDate(u.sessions[0].updatedAt)}` : " · belum pernah masuk"}
                    </p>
                  </div>
                </div>
                <div className="flex flex-none gap-1.5 pl-[52px] sm:pl-0">
                  <FormDialog
                    title={`Ubah akun ${u.name}`}
                    trigger={<Pencil size={16} />}
                    triggerLabel="Ubah"
                    triggerClassName={btn.icon}
                    action={updateUser.bind(null, u.id)}
                  >
                    <Field label="Nama">
                      <TextInput name="name" required maxLength={80} defaultValue={u.name} />
                    </Field>
                    <Field label="Email">
                      <TextInput name="email" type="email" required maxLength={120} defaultValue={u.email} />
                    </Field>
                    <Field label="Peran" hint={me ? "Peranmu sendiri tidak bisa diubah." : "Admin: kelola konten & moderasi. Super Admin: + pengguna, pengaturan, log."}>
                      <SelectInput name="role" defaultValue={u.role} options={roleOptions} disabled={me} />
                    </Field>
                    {me && <input type="hidden" name="role" value={u.role} />}
                  </FormDialog>
                  <FormDialog
                    title={`Atur ulang kata sandi ${u.name}`}
                    description="Semua perangkat akun ini akan dikeluarkan."
                    trigger={<KeyRound size={16} />}
                    triggerLabel="Atur ulang kata sandi"
                    triggerClassName={btn.icon}
                    action={resetPassword.bind(null, u.id)}
                    size="sm"
                  >
                    <Field label="Kata sandi baru" hint="Minimal 8 karakter.">
                      <PasswordInput name="password" required minLength={8} maxLength={128} autoComplete="new-password" />
                    </Field>
                  </FormDialog>
                  {!me && (
                    <>
                      <ConfirmButton
                        action={toggleActive.bind(null, u.id)}
                        title={u.isActive ? `Nonaktifkan ${u.name}?` : `Aktifkan ${u.name}?`}
                        description={
                          u.isActive
                            ? "Akun tidak bisa masuk dan langsung dikeluarkan dari semua perangkat. Data tetap tersimpan."
                            : "Akun bisa masuk kembali."
                        }
                        confirmLabel={u.isActive ? "Nonaktifkan" : "Aktifkan"}
                        tone={u.isActive ? "danger" : "primary"}
                        ariaLabel={u.isActive ? "Nonaktifkan" : "Aktifkan"}
                        className={cx(btn.icon, u.isActive ? "hover:border-danger hover:text-danger" : "text-ok")}
                      >
                        <Power size={16} />
                      </ConfirmButton>
                      <ConfirmButton
                        action={deleteUser.bind(null, u.id)}
                        title={`Hapus akun ${u.name}?`}
                        description="Obrolan & komentarnya dihapus. Pengumuman, materi, dan foto yang pernah diunggah dialihkan ke akunmu. Tidak bisa dibatalkan — pertimbangkan menonaktifkan saja."
                        confirmLabel="Hapus permanen"
                        ariaLabel="Hapus"
                        className={cx(btn.icon, "hover:border-danger hover:text-danger")}
                      >
                        <Trash2 size={16} />
                      </ConfirmButton>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
