import { requireUser } from "@/lib/session";
import PasswordInput from "@/components/ui/PasswordInput";
import { prisma } from "@/lib/prisma";
import ActionForm from "@/components/ui/ActionForm";
import ImagePicker from "@/components/ui/ImagePicker";
import { Field, Row, TextArea, TextInput } from "@/components/ui/Fields";
import { toInputDate } from "@/lib/format";
import { card, cx } from "@/lib/ui";
import { keyToDate, nextDutyOf } from "@/lib/piket";
import { changePassword, updateProfile } from "./actions";

export const metadata = { title: "Akun Saya", robots: { index: false, follow: false } };

export default async function AccountPage() {
  const session = await requireUser("/akun");
  const [user, stats] = await Promise.all([
    prisma.user.findUnique({ where: { id: session.user.id }, include: { profile: true, rosterEntry: { select: { absenNo: true } } } }),
    Promise.all([
      prisma.note.count({ where: { authorId: session.user.id } }),
      prisma.message.count({ where: { senderId: session.user.id, kind: "TEXT", deletedAt: null } }),
      prisma.media.count({ where: { uploadedBy: session.user.id, status: "APPROVED" } }),
      nextDutyOf(session.user.id),
    ]),
  ]);
  if (!user) return null;
  const [notes, posts, photos, piket] = stats;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
      <div className="grid gap-6">
        <div className={cx(card, "p-5 sm:p-7")}>
          <h2 className="text-xl font-bold">Profil</h2>
          <p className="mt-1 text-sm text-muted">Ditampilkan di halaman Tentang dan di samping tulisanmu.</p>
          <div className="mt-6">
            <ActionForm action={updateProfile} submitLabel="Simpan profil">
              <Field label="Foto profil">
                <ImagePicker name="photo" defaultUrl={user.image} removable maxDim={600} aspect="aspect-square" crop={1} cropRound label="Pilih foto" />
              </Field>
              <Row>
                <Field label="Nama lengkap">
                  <TextInput name="name" required defaultValue={user.name} maxLength={80} />
                </Field>
                <Field label="Nama panggilan">
                  <TextInput name="nickname" defaultValue={user.profile?.nickname ?? ""} maxLength={30} />
                </Field>
              </Row>
              <Row>
                <Field label="Instagram" hint="Contoh: @namakamu">
                  <TextInput name="instagram" defaultValue={user.profile?.instagram ?? ""} maxLength={120} />
                </Field>
                <Field label="Tanggal lahir" hint="Muncul di daftar ulang tahun bulan ini.">
                  <TextInput name="birthday" type="date" defaultValue={toInputDate(user.profile?.birthday ?? null)} />
                </Field>
              </Row>
              <Field label="Nomor HP / WhatsApp" hint="Hanya terlihat oleh pengurus.">
                <TextInput name="phone" type="tel" inputMode="tel" defaultValue={user.profile?.phone ?? ""} maxLength={20} />
              </Field>
              <Field label="Bio singkat">
                <TextArea name="bio" rows={3} maxLength={300} defaultValue={user.profile?.bio ?? ""} placeholder="Cerita sedikit tentang dirimu" />
              </Field>
            </ActionForm>
          </div>
        </div>

        <div className={cx(card, "p-5 sm:p-7")}>
          <h2 className="text-xl font-bold">Ganti kata sandi</h2>
          <p className="mt-1 text-sm text-muted">Setelah diganti, perangkat lain yang masih masuk akan dikeluarkan.</p>
          <div className="mt-6">
            <ActionForm action={changePassword} submitLabel="Ganti kata sandi" resetOnSuccess>
              <Field label="Kata sandi lama">
                <PasswordInput name="current" required autoComplete="current-password" />
              </Field>
              <Row>
                <Field label="Kata sandi baru" hint="Minimal 8 karakter.">
                  <PasswordInput name="next" required minLength={8} autoComplete="new-password" />
                </Field>
                <Field label="Ulangi kata sandi baru">
                  <PasswordInput name="confirm" required minLength={8} autoComplete="new-password" />
                </Field>
              </Row>
            </ActionForm>
          </div>
        </div>
      </div>

      <aside className="grid content-start gap-4">
        <div className={cx(card, "p-5")}>
          <h2 className="text-sm font-bold uppercase tracking-wider text-faint">Jejakmu</h2>
          <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
            {[
              { n: notes, l: "catatan" },
              { n: posts, l: "pesan" },
              { n: photos, l: "foto" },
            ].map((s) => (
              <div key={s.l} className="rounded-xl bg-surface-2 py-3">
                <dd className="font-display text-2xl font-bold">{s.n}</dd>
                <dt className="text-xs text-muted">{s.l}</dt>
              </div>
            ))}
          </dl>
        </div>
        <div className={cx(card, "p-5")}>
          <h2 className="text-sm font-bold uppercase tracking-wider text-faint">Giliran piketmu berikutnya</h2>
          <p className="mt-3 font-medium text-fg">
            {piket
              ? keyToDate(piket.key).toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", timeZone: "Asia/Jakarta" })
              : user.rosterEntry?.absenNo
                ? "Belum ada giliran dalam 4 bulan ke depan"
                : "Nomor absen belum diatur pengurus"}
          </p>
          <p className="mt-1 text-sm text-muted">
            {user.rosterEntry?.absenNo ? `Absen ${user.rosterEntry.absenNo} · tugas: ambil absen kelas` : "Piket bergilir sesuai nomor absen."}
            {piket && piket.courses.length > 0 && ` · ${piket.courses.map((c) => c.subject).join(", ")}`}
          </p>
        </div>
      </aside>
    </div>
  );
}
