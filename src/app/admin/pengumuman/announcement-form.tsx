import ImagePicker from "@/components/ui/ImagePicker";
import { Check, Field, Row, SelectInput, TextArea, TextInput } from "@/components/ui/Fields";
import { CATEGORY_LABEL, PRIORITY_LABEL } from "@/lib/announcements";

export type AnnouncementInitial = {
  title: string;
  content: string;
  category: string;
  priority: string;
  status: string;
  isPinned: boolean;
  publishedAt: string;
  expiresAt: string;
  coverUrl: string | null;
  actionLabel: string;
  actionUrl: string;
};

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="grid gap-4 border-t border-line pt-5 first:border-0 first:pt-0">
      <legend className="float-left mb-1 w-full text-xs font-semibold uppercase tracking-wider text-faint">{title}</legend>
      {children}
    </fieldset>
  );
}

export default function AnnouncementFields({ initial }: { initial?: AnnouncementInitial }) {
  return (
    <>
      <Group title="Isi">
        <Field label="Judul">
          <TextInput
            name="title"
            required
            maxLength={120}
            defaultValue={initial?.title}
            placeholder="Contoh: Pengumpulan iuran kas bulan Desember"
          />
        </Field>
        <Row>
          <Field label="Kategori" hint="Sama dengan pilihan filter di halaman Pengumuman.">
            <SelectInput
              name="category"
              defaultValue={initial?.category ?? "GENERAL"}
              options={Object.entries(CATEGORY_LABEL).map(([value, label]) => ({ value, label }))}
            />
          </Field>
          <Field label="Prioritas" hint="Mendesak ditandai merah di semua halaman.">
            <SelectInput
              name="priority"
              defaultValue={initial?.priority ?? "NORMAL"}
              options={Object.entries(PRIORITY_LABEL).map(([value, label]) => ({ value, label }))}
            />
          </Field>
        </Row>
        <Field label="Isi pengumuman" hint="Tekan Enter untuk baris baru. Maksimal 5000 karakter.">
          <TextArea name="content" required rows={8} maxLength={5000} defaultValue={initial?.content} />
        </Field>
      </Group>

      <Group title="Tampilan">
        <Field label="Gambar sampul (opsional)">
          <ImagePicker name="cover" defaultUrl={initial?.coverUrl} removable label="Pilih gambar" aspect="aspect-video" crop={16 / 9} />
        </Field>
        <Row>
          <Field label="Label tombol aksi (opsional)">
            <TextInput name="actionLabel" maxLength={40} defaultValue={initial?.actionLabel} placeholder="Isi formulir" />
          </Field>
          <Field label="Tautan tombol aksi">
            <TextInput name="actionUrl" type="url" defaultValue={initial?.actionUrl} placeholder="https://..." />
          </Field>
        </Row>
      </Group>

      <Group title="Jadwal & status">
        <Row>
          <Field label="Tanggal tayang" hint="Kosongkan untuk tayang sekarang.">
            <TextInput name="publishedAt" type="datetime-local" defaultValue={initial?.publishedAt} />
          </Field>
          <Field label="Berakhir (opsional)" hint="Setelah ini pengumuman diarsipkan.">
            <TextInput name="expiresAt" type="datetime-local" defaultValue={initial?.expiresAt} />
          </Field>
        </Row>
        <Row>
          <Field label="Status">
            <SelectInput
              name="status"
              defaultValue={initial?.status ?? "PUBLISHED"}
              options={[
                { value: "PUBLISHED", label: "Terbit" },
                { value: "DRAFT", label: "Draf (disimpan, belum tampil)" },
              ]}
            />
          </Field>
          <div className="flex items-end pb-2">
            <Check name="isPinned" label="Sematkan di paling atas" defaultChecked={initial?.isPinned} />
          </div>
        </Row>
        {!initial && <p className="text-xs text-faint">Anggota akan menerima notifikasi bila pengumuman langsung terbit.</p>}
      </Group>
    </>
  );
}
