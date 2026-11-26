import { BookOpen, ExternalLink, FileText, Pencil, Plus, Trash2 } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";
import AdminHeader from "@/components/admin/AdminHeader";
import FormDialog from "@/components/ui/FormDialog";
import ConfirmButton from "@/components/ui/ConfirmButton";
import { Field, SelectInput, TextInput } from "@/components/ui/Fields";
import { getSubjects } from "@/lib/subjects";
import { EmptyState } from "@/components/ui/bits";
import { shortDate } from "@/lib/format";
import { MATERIAL_CATEGORIES } from "@/lib/labels";
import { btn, card, cx } from "@/lib/ui";
import { createMaterial, deleteMaterial, updateMaterial } from "./actions";

export const metadata = { title: "Materi" };

function MaterialFields({
  m,
  subjects,
}: {
  m?: { title: string; category: string | null; subject: string | null; fileUrl: string };
  subjects: string[];
}) {
  const isLink = m && !m.fileUrl.startsWith("/files/");

  const options = m?.subject && !subjects.includes(m.subject) ? [...subjects, m.subject] : subjects;
  return (
    <>
      <Field label="Judul materi">
        <TextInput name="title" required maxLength={120} defaultValue={m?.title} placeholder="Slide Pertemuan 3: Normalisasi" />
      </Field>
      <Field
        label="Mata kuliah"
        hint={subjects.length ? "Diambil dari jadwal kuliah. Tambah mata kuliah baru lewat menu Jadwal." : "Isi jadwal kuliah dulu supaya mata kuliah bisa dipilih."}
      >
        <SelectInput
          name="subject"
          defaultValue={m?.subject ?? ""}
          options={[{ value: "", label: "— Umum (bukan mata kuliah tertentu) —" }, ...options.map((s) => ({ value: s, label: s }))]}
        />
      </Field>
      <Field label="Kategori" hint="Sama dengan pilihan filter di halaman Materi.">
        <SelectInput
          name="category"
          defaultValue={m?.category && MATERIAL_CATEGORIES.includes(m.category) ? m.category : "Lainnya"}
          options={MATERIAL_CATEGORIES.map((c) => ({ value: c, label: c }))}
        />
      </Field>
      <Field
        label={m ? "Ganti file (opsional)" : "File"}
        hint="PDF, Word, PowerPoint, Excel, TXT, ZIP, atau gambar. Maks 25 MB."
      >
        <input
          type="file"
          name="file"
          accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.zip,image/*"
          className="block w-full text-sm text-muted file:mr-3 file:min-h-10 file:cursor-pointer file:rounded-lg file:border-0 file:bg-surface-3 file:px-4 file:font-semibold file:text-fg hover:file:bg-line-strong"
        />
      </Field>
      <Field label="…atau tautan (Google Drive, dll.)">
        <TextInput name="link" type="url" placeholder="https://" defaultValue={isLink ? m.fileUrl : ""} />
      </Field>
      {!m && <p className="text-xs text-faint">Semua anggota otomatis mendapat notifikasi (di situs dan push ke HP).</p>}
    </>
  );
}

export default async function AdminMaterialsPage() {
  await requireAdmin();
  const [items, subjects] = await Promise.all([
    prisma.material.findMany({
      orderBy: { createdAt: "desc" },
      include: { uploader: { select: { displayName: true } } },
    }),
    getSubjects(),
  ]);

  return (
    <div>
      <AdminHeader title="Materi" description="File dan tautan belajar yang bisa diunduh anggota di halaman Materi.">
        <FormDialog
          title="Tambah materi"
          trigger={
            <>
              <Plus size={18} /> Tambah materi
            </>
          }
          action={createMaterial}
        >
          <MaterialFields subjects={subjects} />
        </FormDialog>
      </AdminHeader>
      {items.length === 0 ? (
        <EmptyState icon={<BookOpen size={32} />} title="Belum ada materi" />
      ) : (
        <div className={cx(card, "divide-y divide-line")}>
          {items.map((m) => {
            const external = !m.fileUrl.startsWith("/files/");
            return (
              <div key={m.id} className="flex items-center gap-4 p-4">
                <span className="flex h-11 w-11 flex-none items-center justify-center rounded-xl bg-surface-3 text-brand">
                  {external ? <ExternalLink size={18} /> : <FileText size={18} />}
                </span>
                <div className="min-w-0 flex-1">
                  <a href={m.fileUrl} target="_blank" rel="noopener noreferrer" className="block truncate font-semibold hover:text-brand">
                    {m.title}
                  </a>
                  <p className="truncate text-sm text-muted">
                    {[m.subject ?? "Umum", m.category, m.uploader.displayName, shortDate(m.createdAt)].filter(Boolean).join(" · ")}
                  </p>
                </div>
                <div className="flex flex-none gap-1.5">
                  <FormDialog
                    title="Ubah materi"
                    trigger={<Pencil size={17} />}
                    triggerLabel="Ubah"
                    triggerClassName={btn.icon}
                    action={updateMaterial.bind(null, m.id)}
                  >
                    <MaterialFields m={m} subjects={subjects} />
                  </FormDialog>
                  <ConfirmButton
                    action={deleteMaterial.bind(null, m.id)}
                    title="Hapus materi?"
                    description={<>“{m.title}” dan filenya akan dihapus.</>}
                    confirmLabel="Hapus"
                    ariaLabel="Hapus"
                    className={cx(btn.icon, "hover:border-danger hover:text-danger")}
                  >
                    <Trash2 size={17} />
                  </ConfirmButton>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
