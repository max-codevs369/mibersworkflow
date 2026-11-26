import { requireSuperAdmin } from "@/lib/session";
import { getSettings, flag } from "@/lib/settings";
import AdminHeader from "@/components/admin/AdminHeader";
import ActionForm from "@/components/ui/ActionForm";
import ImagePicker from "@/components/ui/ImagePicker";
import { Check, Field, Row, TextArea, TextInput } from "@/components/ui/Fields";
import { card, cx } from "@/lib/ui";
import { saveSettings } from "./actions";

export const metadata = { title: "Pengaturan Situs" };

function Section({ title, desc, children }: { title: string; desc?: string; children: React.ReactNode }) {
  return (
    <section className={cx(card, "overflow-hidden")}>
      <div className="border-b border-line bg-surface-2/60 px-5 py-4 sm:px-6">
        <h2 className="font-bold">{title}</h2>
        {desc && <p className="mt-0.5 text-sm text-muted">{desc}</p>}
      </div>
      <div className="grid gap-5 p-5 sm:p-6">{children}</div>
    </section>
  );
}

export default async function SettingsPage() {
  await requireSuperAdmin();
  const s = await getSettings();

  return (
    <div>
      <AdminHeader title="Pengaturan situs" description="Identitas kelas dan aturan dinding catatan & galeri." />

      <ActionForm
        action={saveSettings}
        submitLabel="Simpan pengaturan"
        actionsClassName="sticky bottom-3 z-10 justify-end rounded-xl border border-line bg-surface/95 p-3 shadow-lg shadow-black/30 backdrop-blur"
      >
        <div className="grid gap-5 xl:grid-cols-2 xl:items-start">
        <div className="grid gap-5">
        <Section title="Identitas" desc="Tampil di judul tab, navigasi, dan footer.">
          <Row>
            <Field label="Nama situs">
              <TextInput name="site_name" required maxLength={60} defaultValue={s.site_name} />
            </Field>
            <Field label="Nama singkat">
              <TextInput name="site_short" maxLength={20} defaultValue={s.site_short} />
            </Field>
          </Row>
          <Field label="Slogan">
            <TextInput name="site_tagline" maxLength={80} defaultValue={s.site_tagline} />
          </Field>
          <Field label="Deskripsi singkat" hint="Muncul di beranda dan hasil pencarian Google.">
            <TextArea name="site_description" rows={2} maxLength={240} defaultValue={s.site_description} />
          </Field>
          <Field label="Foto utama beranda" hint="Opsional. Tampil paling depan di hero beranda, sebelum foto pilihan dari galeri.">
            <ImagePicker name="hero_image" defaultUrl={s.hero_image || null} removable aspect="aspect-[4/5]" crop={4 / 5} />
          </Field>
        </Section>

        <Section title="Kontak">
          <Row>
            <Field label="Tautan Instagram">
              <TextInput name="instagram" type="url" defaultValue={s.instagram} />
            </Field>
            <Field label="Email kontak (opsional)">
              <TextInput name="contact_email" type="email" defaultValue={s.contact_email} />
            </Field>
          </Row>
        </Section>

        </div>
        <div className="grid gap-5">
        <Section title="Info kelas" desc="Tampil di beranda dan halaman Tentang.">
          <Row>
            <Field label="Kampus">
              <TextInput name="school_name" maxLength={100} defaultValue={s.school_name} />
            </Field>
            <Field label="Jurusan" hint="Tanpa kata “Jurusan”, misalnya: Teknologi Informasi">
              <TextInput name="department" maxLength={100} defaultValue={s.department} placeholder="Teknologi Informasi" />
            </Field>
          </Row>
          <Row>
            <Field label="Program studi">
              <TextInput name="study_program" maxLength={100} defaultValue={s.study_program} placeholder="D3 Manajemen Informatika" />
            </Field>
          </Row>
          <Row>
            <Field label="Angkatan">
              <TextInput name="class_year" maxLength={20} defaultValue={s.class_year} />
            </Field>
            <Field label="Dosen wali / PA">
              <TextInput name="homeroom" maxLength={80} defaultValue={s.homeroom} />
            </Field>
          </Row>
        </Section>

        <Section title="Dinding catatan" desc="Batas dihitung per perangkat dalam 24 jam.">
          <Check
            name="note_guest_enabled"
            label="Tamu (tanpa akun) boleh menempel catatan"
            hint="Catatan tamu selalu menunggu persetujuan admin."
            defaultChecked={flag(s.note_guest_enabled)}
          />
          <Check
            name="note_member_auto_approve"
            label="Catatan anggota langsung tampil tanpa moderasi"
            defaultChecked={flag(s.note_member_auto_approve)}
          />
          <Row>
            <Field label="Batas harian tamu">
              <TextInput name="note_guest_daily_limit" type="number" min={0} max={100} defaultValue={s.note_guest_daily_limit} />
            </Field>
            <Field label="Batas harian anggota">
              <TextInput name="note_member_daily_limit" type="number" min={0} max={100} defaultValue={s.note_member_daily_limit} />
            </Field>
          </Row>
        </Section>

        <Section title="Galeri">
          <Check
            name="gallery_member_auto_approve"
            label="Foto kiriman anggota langsung tampil tanpa moderasi"
            defaultChecked={flag(s.gallery_member_auto_approve)}
          />
        </Section>
        </div>
        </div>
      </ActionForm>
    </div>
  );
}
