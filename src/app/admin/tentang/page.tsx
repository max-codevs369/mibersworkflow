import { ArrowDown, ArrowUp, EyeOff, Info, Pencil, Plus, Trash2 } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";
import AdminHeader from "@/components/admin/AdminHeader";
import FormDialog from "@/components/ui/FormDialog";
import ConfirmButton from "@/components/ui/ConfirmButton";
import ImagePicker from "@/components/ui/ImagePicker";
import { Check, Field, TextArea, TextInput } from "@/components/ui/Fields";
import { EmptyState } from "@/components/ui/bits";
import { badge, btn, card, cx } from "@/lib/ui";
import { createAbout, deleteAbout, moveAbout, updateAbout } from "./actions";
import { thumbUrl } from "@/lib/thumb";

export const metadata = { title: "Tentang Kelas" };

function AboutFields({ s }: { s?: { title: string; content: string; imageUrl: string | null; isVisible: boolean } }) {
  return (
    <>
      <Field label="Judul bagian">
        <TextInput name="title" required maxLength={80} defaultValue={s?.title} placeholder="Visi kelas" />
      </Field>
      <Field label="Isi" hint="Bagian pertama tampil sebagai paragraf pembuka di beranda.">
        <TextArea name="content" required rows={8} maxLength={4000} defaultValue={s?.content} />
      </Field>
      <Field label="Foto pendamping (opsional)">
        <ImagePicker name="image" defaultUrl={s?.imageUrl} removable crop={4 / 3} />
      </Field>
      <Check name="isVisible" label="Tampilkan di situs" defaultChecked={s?.isVisible ?? true} />
    </>
  );
}

export default async function AdminAboutPage() {
  await requireAdmin();
  const sections = await prisma.aboutSection.findMany({ orderBy: [{ sortOrder: "asc" }, { id: "asc" }] });

  return (
    <div>
      <AdminHeader
        title="Tentang kelas"
        description="Profil, sejarah, visi, dan misi. Tampil di beranda (saat di-scroll) dan halaman Tentang. Info kampus diatur di Pengaturan situs."
      >
        <FormDialog
          title="Tambah bagian"
          trigger={
            <>
              <Plus size={18} /> Tambah bagian
            </>
          }
          action={createAbout}
          size="lg"
        >
          <AboutFields />
        </FormDialog>
      </AdminHeader>
      {sections.length === 0 ? (
        <EmptyState icon={<Info size={32} />} title="Belum ada isi">
          Mulai dengan bagian “Tentang kami”, lalu “Visi” dan “Misi”.
        </EmptyState>
      ) : (
        <div className="grid gap-3">
          {sections.map((s, i) => (
            <article key={s.id} className={cx(card, "flex gap-4 p-4 sm:p-5", !s.isVisible && "opacity-60")}>
              <div className="flex flex-none flex-col gap-1">
                <ConfirmButton
                  action={moveAbout.bind(null, s.id, "up")}
                  skipConfirm
                  ariaLabel="Naikkan"
                  className="flex h-8 w-8 items-center justify-center rounded-md border border-line text-muted hover:text-fg disabled:opacity-30"
                >
                  <ArrowUp size={15} />
                </ConfirmButton>
                <ConfirmButton
                  action={moveAbout.bind(null, s.id, "down")}
                  skipConfirm
                  ariaLabel="Turunkan"
                  className="flex h-8 w-8 items-center justify-center rounded-md border border-line text-muted hover:text-fg"
                >
                  <ArrowDown size={15} />
                </ConfirmButton>
              </div>
              {s.imageUrl && (
                <img src={thumbUrl(s.imageUrl, 224)} alt="" className="hidden h-20 w-28 flex-none rounded-lg object-cover sm:block" />
              )}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-bold text-faint">#{i + 1}</span>
                  <h2 className="font-bold">{s.title}</h2>
                  {!s.isVisible && (
                    <span className={cx(badge, "bg-surface-3 text-muted")}>
                      <EyeOff size={11} /> TERSEMBUNYI
                    </span>
                  )}
                </div>
                <p className="mt-1 line-clamp-3 whitespace-pre-line text-sm text-muted">{s.content}</p>
              </div>
              <div className="flex flex-none flex-col gap-1.5 sm:flex-row">
                <FormDialog
                  title="Ubah bagian"
                  trigger={<Pencil size={17} />}
                  triggerLabel="Ubah"
                  triggerClassName={btn.icon}
                  action={updateAbout.bind(null, s.id)}
                  size="lg"
                >
                  <AboutFields s={s} />
                </FormDialog>
                <ConfirmButton
                  action={deleteAbout.bind(null, s.id)}
                  title="Hapus bagian ini?"
                  description={<>“{s.title}” akan dihapus.</>}
                  confirmLabel="Hapus"
                  ariaLabel="Hapus"
                  className={cx(btn.icon, "hover:border-danger hover:text-danger")}
                >
                  <Trash2 size={17} />
                </ConfirmButton>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
