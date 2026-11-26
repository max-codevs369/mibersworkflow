import { Field, Row, SelectInput, TextArea, TextInput } from "@/components/ui/Fields";
import { toInputDate } from "@/lib/format";
import { ALBUM_CATEGORY_LABEL } from "@/lib/labels";

export default function AlbumFields({
  a,
}: {
  a?: { title: string; description: string | null; eventDate: Date | null; visibility: string; category: string };
}) {
  return (
    <>
      <Field label="Judul album">
        <TextInput name="title" required maxLength={100} defaultValue={a?.title} placeholder="Classmeeting 2026" />
      </Field>
      <Field label="Kategori">
        <SelectInput
          name="category"
          defaultValue={a?.category ?? "KEGIATAN"}
          options={Object.entries(ALBUM_CATEGORY_LABEL).map(([value, label]) => ({ value, label }))}
        />
      </Field>
      <Row>
        <Field label="Tanggal kegiatan (opsional)">
          <TextInput name="eventDate" type="date" defaultValue={toInputDate(a?.eventDate ?? null)} />
        </Field>
        <Field label="Siapa yang bisa melihat">
          <SelectInput
            name="visibility"
            defaultValue={a?.visibility ?? "PUBLIC"}
            options={[
              { value: "PUBLIC", label: "Semua orang" },
              { value: "MEMBERS_ONLY", label: "Hanya anggota yang masuk" },
            ]}
          />
        </Field>
      </Row>
      <Field label="Cerita singkat (opsional)">
        <TextArea name="description" rows={3} maxLength={1000} defaultValue={a?.description ?? ""} />
      </Field>
    </>
  );
}
