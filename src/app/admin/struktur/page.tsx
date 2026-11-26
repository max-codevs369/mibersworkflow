import Link from "next/link";
import { descendantsOf } from "@/lib/orgtree";
import { CircleCheck, Network, Pencil, Plus, Trash2, UserRound } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";
import AdminHeader from "@/components/admin/AdminHeader";
import FormDialog from "@/components/ui/FormDialog";
import ConfirmButton from "@/components/ui/ConfirmButton";
import ImagePicker from "@/components/ui/ImagePicker";
import { Check, Field, Row, SelectInput, TextInput } from "@/components/ui/Fields";
import { Avatar, EmptyState } from "@/components/ui/bits";
import { badge, btn, card, chip, cx } from "@/lib/ui";
import {
  activatePeriod,
  deleteMember,
  deletePeriod,
  deletePosition,
  saveMember,
  savePeriod,
  savePosition,
} from "./actions";

export const metadata = { title: "Struktur Organisasi" };

export default async function AdminStructurePage({ searchParams }: { searchParams: Promise<{ periode?: string }> }) {
  await requireAdmin();
  const sp = await searchParams;
  const [periods, positions, users] = await Promise.all([
    prisma.organizationPeriod.findMany({
      orderBy: [{ isActive: "desc" }, { startYear: "desc" }],
      include: { _count: { select: { members: true } } },
    }),
    prisma.position.findMany({
      orderBy: [{ level: "asc" }, { sortOrder: "asc" }, { title: "asc" }],
      include: { _count: { select: { members: true } } },
    }),
    prisma.user.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);
  const period = periods.find((p) => p.id === sp.periode) ?? periods.find((p) => p.isActive) ?? periods[0];
  const members = period
    ? await prisma.organizationMember.findMany({
        where: { periodId: period.id },
        orderBy: [{ position: { level: "asc" } }, { position: { sortOrder: "asc" } }, { sortOrder: "asc" }],
        include: { position: true, user: { select: { name: true, image: true } } },
      })
    : [];

  const year = new Date().getFullYear();
  const positionOptions = positions.map((p) => ({ value: p.id, label: `${p.title} (tingkat ${p.level})` }));
  const userOptions = [{ value: "", label: "— tidak terhubung ke akun —" }, ...users.map((u) => ({ value: u.id, label: u.name }))];

  const memberFields = (m?: (typeof members)[number]) => (
    <>
      <Field label="Jabatan">
        <SelectInput name="positionId" required defaultValue={m?.positionId ?? positions[0]?.id} options={positionOptions} />
      </Field>
      <Field label="Akun anggota" hint="Nama & foto profil akun dipakai bila kolom di bawah dikosongkan.">
        <SelectInput name="userId" defaultValue={m?.userId ?? ""} options={userOptions} />
      </Field>
      <Row>
        <Field label="Nama yang ditampilkan (opsional)" hint="Misalnya untuk dosen wali tanpa akun.">
          <TextInput name="displayName" maxLength={80} defaultValue={m?.displayName ?? ""} />
        </Field>
        <Field label="Urutan" hint="Angka kecil tampil lebih dulu.">
          <TextInput name="sortOrder" type="number" min={0} max={999} defaultValue={m?.sortOrder ?? 0} />
        </Field>
      </Row>
      <Field label="Foto khusus (opsional)">
        <ImagePicker name="photo" defaultUrl={m?.photoUrl} removable maxDim={900} aspect="aspect-square" crop={1} />
      </Field>
    </>
  );

  return (
    <div>
      <AdminHeader title="Struktur organisasi" description="Susun periode kepengurusan, jabatan, dan orang-orangnya." />

      <div className="grid gap-6">
        <div className="grid gap-6 lg:grid-cols-2">
          <section className={cx(card, "p-5")}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-bold">Periode kepengurusan</h2>
              <FormDialog
                title="Periode baru"
                trigger={
                  <>
                    <Plus size={15} /> Periode
                  </>
                }
                triggerClassName={btn.sm}
                action={savePeriod.bind(null, null)}
              >
                <Field label="Nama periode">
                  <TextInput name="name" required maxLength={80} placeholder={`Kepengurusan ${year}/${year + 1}`} />
                </Field>
                <Row>
                  <Field label="Tahun mulai">
                    <TextInput name="startYear" type="number" required defaultValue={year} />
                  </Field>
                  <Field label="Tahun selesai">
                    <TextInput name="endYear" type="number" required defaultValue={year + 1} />
                  </Field>
                </Row>
                <Check name="isActive" label="Jadikan periode aktif (tampil di situs)" />
              </FormDialog>
            </div>
            {periods.length === 0 ? (
              <p className="mt-3 text-sm text-faint">Buat periode dulu, misalnya “Kepengurusan {year}/{year + 1}”.</p>
            ) : (
              <div className="mt-4 flex flex-wrap gap-2">
                {periods.map((p) => (
                  <Link key={p.id} href={`/admin/struktur?periode=${p.id}`} className={chip(p.id === period?.id)}>
                    {p.name}
                    {p.isActive && <CircleCheck size={14} />}
                  </Link>
                ))}
              </div>
            )}
            {period && (
              <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-line pt-4 text-sm">
                <span className="text-muted">
                  {period.startYear}/{period.endYear} · {period._count.members} pengurus
                </span>
                {period.isActive ? (
                  <span className={cx(badge, "bg-ok/15 text-ok")}>AKTIF DI SITUS</span>
                ) : (
                  <ConfirmButton
                    action={activatePeriod.bind(null, period.id)}
                    title="Aktifkan periode ini?"
                    description="Periode ini yang akan tampil di beranda dan halaman Struktur."
                    confirmLabel="Aktifkan"
                    tone="primary"
                    className={btn.sm}
                  >
                    Jadikan aktif
                  </ConfirmButton>
                )}
                <span className="ml-auto flex gap-1.5">
                  <FormDialog
                    title="Ubah periode"
                    trigger={<Pencil size={15} />}
                    triggerLabel="Ubah periode"
                    triggerClassName={btn.sm}
                    action={savePeriod.bind(null, period.id)}
                  >
                    <Field label="Nama periode">
                      <TextInput name="name" required maxLength={80} defaultValue={period.name} />
                    </Field>
                    <Row>
                      <Field label="Tahun mulai">
                        <TextInput name="startYear" type="number" required defaultValue={period.startYear} />
                      </Field>
                      <Field label="Tahun selesai">
                        <TextInput name="endYear" type="number" required defaultValue={period.endYear} />
                      </Field>
                    </Row>
                    <Check name="isActive" label="Jadikan periode aktif" defaultChecked={period.isActive} />
                  </FormDialog>
                  <ConfirmButton
                    action={deletePeriod.bind(null, period.id)}
                    title="Hapus periode?"
                    description={`“${period.name}” beserta ${period._count.members} data pengurusnya akan dihapus.`}
                    confirmLabel="Hapus"
                    ariaLabel="Hapus periode"
                    className={btn.smDanger}
                  >
                    <Trash2 size={15} />
                  </ConfirmButton>
                </span>
              </div>
            )}
          </section>

          <section className={cx(card, "p-5")}>
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-bold">Jabatan</h2>
              <FormDialog
                title="Jabatan baru"
                trigger={
                  <>
                    <Plus size={15} /> Jabatan
                  </>
                }
                triggerClassName={btn.sm}
                action={savePosition.bind(null, null)}
                size="sm"
              >
                <Field label="Nama jabatan">
                  <TextInput name="title" required maxLength={60} placeholder="Bendahara" />
                </Field>
                <Field label="Di bawah jabatan" hint="Pilih atasan langsung. Jabatan yang atasannya sama tampil berdampingan sebagai cabang.">
                  <SelectInput
                    name="parentId"
                    defaultValue=""
                    options={[{ value: "", label: "Otomatis (sesuai tingkat)" }, ...positions.map((x) => ({ value: x.id, label: x.title }))]}
                  />
                </Field>
                <Row>
                  <Field label="Tingkat" hint="0 = paling atas. Diabaikan bila atasan dipilih.">
                    <TextInput name="level" type="number" min={0} max={9} required defaultValue={1} />
                  </Field>
                  <Field label="Urutan">
                    <TextInput name="sortOrder" type="number" min={0} max={999} defaultValue={0} />
                  </Field>
                </Row>
              </FormDialog>
            </div>
            <p className="mt-1 text-xs text-faint">
              Atur “Di bawah jabatan” agar bagan bercabang. Contoh: Sekretaris dan Bendahara sama-sama di bawah Wakil Ketua, lalu Sekretaris 2 di bawah Sekretaris.
            </p>
            <ul className="mt-4 grid gap-1">
              {positions.length === 0 && <li className="text-sm text-faint">Belum ada jabatan.</li>}
              {positions.map((p) => (
                <li key={p.id} className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-surface-2">
                  <span className="flex h-6 w-6 flex-none items-center justify-center rounded bg-surface-3 text-[11px] font-bold text-muted">
                    {p.level}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm">
                    {p.title}
                    {p.parentId && (
                      <span className="ml-1 text-xs text-faint">↳ {positions.find((x) => x.id === p.parentId)?.title}</span>
                    )}
                  </span>
                  <span className="text-[11px] text-faint">{p._count.members}</span>
                  <FormDialog
                    title="Ubah jabatan"
                    trigger={<Pencil size={13} />}
                    triggerLabel="Ubah"
                    triggerClassName="flex h-8 w-8 items-center justify-center rounded-md text-faint hover:text-fg"
                    action={savePosition.bind(null, p.id)}
                    size="sm"
                  >
                    <Field label="Nama jabatan">
                      <TextInput name="title" required maxLength={60} defaultValue={p.title} />
                    </Field>
                    <Field label="Di bawah jabatan" hint="Jabatan yang atasannya sama tampil berdampingan sebagai cabang.">
                      <SelectInput
                        name="parentId"
                        defaultValue={p.parentId ?? ""}
                        options={[
                          { value: "", label: "Otomatis (sesuai tingkat)" },
                          ...positions
                            .filter((x) => x.id !== p.id && !descendantsOf(positions, p.id).has(x.id))
                            .map((x) => ({ value: x.id, label: x.title })),
                        ]}
                      />
                    </Field>
                    <Row>
                      <Field label="Tingkat" hint="Diabaikan bila atasan dipilih.">
                        <TextInput name="level" type="number" min={0} max={9} required defaultValue={p.level} />
                      </Field>
                      <Field label="Urutan">
                        <TextInput name="sortOrder" type="number" min={0} max={999} defaultValue={p.sortOrder} />
                      </Field>
                    </Row>
                  </FormDialog>
                  <ConfirmButton
                    action={deletePosition.bind(null, p.id)}
                    title="Hapus jabatan?"
                    description={`“${p.title}” akan dihapus.`}
                    confirmLabel="Hapus"
                    ariaLabel="Hapus"
                    className="flex h-8 w-8 items-center justify-center rounded-md text-faint hover:text-danger"
                  >
                    <Trash2 size={13} />
                  </ConfirmButton>
                </li>
              ))}
            </ul>
          </section>
        </div>

          <section className={cx(card, "p-5")}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-bold">Pengurus {period ? `· ${period.name}` : ""}</h2>
              {period && positions.length > 0 && (
                <FormDialog
                  title="Tambah pengurus"
                  trigger={
                    <>
                      <Plus size={15} /> Pengurus
                    </>
                  }
                  triggerClassName={btn.smPrimary}
                  action={saveMember.bind(null, period.id, null)}
                >
                  {memberFields()}
                </FormDialog>
              )}
            </div>
            {!period ? (
              <p className="mt-3 text-sm text-faint">Buat periode terlebih dahulu.</p>
            ) : positions.length === 0 ? (
              <p className="mt-3 text-sm text-faint">Tambahkan jabatan di kartu Jabatan terlebih dahulu.</p>
            ) : members.length === 0 ? (
              <EmptyState icon={<Network size={28} />} title="Belum ada pengurus" className="mt-4" />
            ) : (
              <ul className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                {members.map((m) => {
                  const name = m.displayName || m.user?.name || "—";
                  return (
                    <li key={m.id} className="flex items-center gap-3 rounded-xl bg-surface-2 p-3">
                      <Avatar name={name} src={m.photoUrl || m.user?.image} size={44} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold">{name}</p>
                        <p className="truncate text-xs text-brand">{m.position.title}</p>
                        {!m.userId && (
                          <p className="flex items-center gap-1 text-[11px] text-faint">
                            <UserRound size={11} /> tanpa akun
                          </p>
                        )}
                      </div>
                      <FormDialog
                        title="Ubah pengurus"
                        trigger={<Pencil size={15} />}
                        triggerLabel="Ubah"
                        triggerClassName="flex h-9 w-9 items-center justify-center rounded-md text-muted hover:bg-surface-3 hover:text-fg"
                        action={saveMember.bind(null, period.id, m.id)}
                      >
                        {memberFields(m)}
                      </FormDialog>
                      <ConfirmButton
                        action={deleteMember.bind(null, m.id)}
                        title="Hapus dari struktur?"
                        description={`${name} (${m.position.title}) akan dihapus dari periode ini.`}
                        confirmLabel="Hapus"
                        ariaLabel="Hapus"
                        className="flex h-9 w-9 items-center justify-center rounded-md text-muted hover:bg-surface-3 hover:text-danger"
                      >
                        <Trash2 size={15} />
                      </ConfirmButton>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
      </div>
    </div>
  );
}
