import LegalDoc from "@/components/LegalDoc";
import { getSettings } from "@/lib/settings";

export const metadata = {
  title: "Kebijakan Privasi",
  description: "Data apa saja yang dikumpulkan situs kelas, untuk apa, dan bagaimana kami menjaganya.",
  alternates: { canonical: "/privasi" },
};

export default async function PrivacyPage() {
  const s = await getSettings();
  const contact = s.contact_email ? (
    <>
      email <strong>{s.contact_email}</strong>
    </>
  ) : (
    <>pengurus kelas secara langsung atau lewat Instagram kelas</>
  );

  return (
    <LegalDoc
      title="Kebijakan Privasi"
      description={`Penjelasan jujur tentang data yang disimpan ${s.site_name}, untuk apa, dan bagaimana kamu bisa mengaturnya.`}
      updated="25 November 2026"
      other={{ href: "/ketentuan", label: "Ketentuan Layanan" }}
      summary={[
        "Situs ini dibuat untuk keperluan internal kelas, bukan untuk bisnis. Datamu tidak dijual atau dibagikan ke pihak lain.",
        "Kami hanya menyimpan data yang dibutuhkan agar fitur situs berjalan.",
        "Nomor HP hanya terlihat oleh anggota yang sudah masuk, dan tahun lahirmu tidak pernah ditampilkan.",
        "Chat pribadi hanya bisa dibuka oleh kamu dan lawan bicaramu. Tidak ada fitur bagi pengurus untuk membacanya.",
      ]}
      sections={[
        {
          id: "data",
          title: "Data yang kami simpan",
          body: (
            <>
              <p>Tergantung cara kamu memakai situs, data yang tersimpan bisa berupa:</p>
              <ul>
                <li>
                  <strong>Akun anggota:</strong> nama, email, peran, dan kata sandi yang disimpan dalam bentuk terenkripsi (hash), bukan teks asli.
                </li>
                <li>
                  <strong>Profil (opsional):</strong> foto, nama panggilan, tanggal lahir, bio, Instagram, nomor HP, dan jabatan. Semuanya kamu isi sendiri dan boleh dikosongkan.
                </li>
                <li>
                  <strong>Konten yang kamu kirim:</strong> catatan di dinding, foto dan video galeri, serta pesan di ruang obrolan.
                </li>
                <li>
                  <strong>Pengunjung tanpa akun:</strong> isi catatan dan nama yang kamu tulis, ditambah penanda perangkat dan alamat IP yang sudah diacak (hash) untuk mencegah spam.
                </li>
                <li>
                  <strong>Catatan aktivitas pengurus:</strong> tindakan seperti menghapus atau menyetujui konten dicatat agar bisa dipertanggungjawabkan.
                </li>
              </ul>
            </>
          ),
        },
        {
          id: "penggunaan",
          title: "Untuk apa data itu dipakai",
          body: (
            <ul>
              <li>Menjalankan fitur situs: masuk akun, mengirim pesan, menampilkan profil, dan galeri.</li>
              <li>Mengirim notifikasi di dalam situs, misalnya pengumuman baru atau pesan yang belum dibaca.</li>
              <li>Menjaga keamanan: membatasi percobaan masuk, menyaring spam, dan memblokir kata yang tidak pantas.</li>
              <li>Moderasi konten oleh pengurus agar situs tetap nyaman untuk semua.</li>
            </ul>
          ),
        },
        {
          id: "visibilitas",
          title: "Siapa yang bisa melihat apa",
          body: (
            <ul>
              <li>
                <strong>Semua orang:</strong> pengumuman publik, agenda, dinding catatan, album publik, serta nama, foto, bio, dan Instagram di profil anggota.
              </li>
              <li>
                <strong>Anggota yang sudah masuk:</strong> materi kuliah, album khusus anggota, nomor WhatsApp di profil, dan ruang obrolan.
              </li>
              <li>
                <strong>Hanya peserta obrolan:</strong> isi chat pribadi dan grup. Pembuat grup dan pengurus bisa mengatur anggota grup, dan pengurus bisa menghapus pesan yang melanggar di grup, tetapi tidak ada fitur untuk membuka chat pribadi.
              </li>
              <li>
                <strong>Catatan anonim:</strong> namamu tidak ditampilkan ke publik. Bila kamu mengirimnya saat sudah masuk akun, pengurus tetap bisa melihat akun pengirimnya untuk keperluan moderasi.
              </li>
            </ul>
          ),
        },
        {
          id: "cookie",
          title: "Cookie",
          body: (
            <>
              <p>Situs ini hanya memakai cookie yang benar-benar diperlukan, dan tidak memakai cookie iklan atau pelacak pihak ketiga:</p>
              <ul>
                <li>
                  <strong>Cookie sesi:</strong> menjaga kamu tetap masuk ke akun.
                </li>
                <li>
                  <strong>Penanda perangkat:</strong> mengingat reaksi di dinding catatan dan membatasi kiriman catatan per perangkat. Berlaku hingga 2 tahun.
                </li>
              </ul>
            </>
          ),
        },
        {
          id: "keamanan",
          title: "Cara kami menjaga data",
          body: (
            <ul>
              <li>Kata sandi disimpan dalam bentuk hash dan tidak pernah bisa dilihat siapa pun, termasuk pengurus.</li>
              <li>File khusus anggota (materi dan album privat) hanya bisa dibuka setelah masuk.</li>
              <li>Ada batas percobaan masuk untuk mencegah tebak-tebakan kata sandi.</li>
              <li>
                Meski begitu, tidak ada sistem yang 100% aman. Pengelola server secara teknis bisa mengakses database untuk keperluan pemeliharaan, jadi hindari mengirim data yang sangat sensitif seperti PIN atau kata sandi.
              </li>
            </ul>
          ),
        },
        {
          id: "hak",
          title: "Hakmu atas datamu",
          body: (
            <ul>
              <li>Kamu bisa mengubah atau mengosongkan data profil kapan saja lewat halaman Akun.</li>
              <li>Kamu bisa menghapus pesanmu sendiri di obrolan, dan keluar dari grup kapan saja.</li>
              <li>Untuk menghapus akun, catatan, atau foto yang memuat dirimu, hubungi {contact}.</li>
            </ul>
          ),
        },
        {
          id: "penyimpanan",
          title: "Berapa lama data disimpan",
          body: (
            <p>
              Data disimpan selama situs ini aktif dan kamu masih terdaftar sebagai anggota. Saat akun dihapus pengurus, data profil ikut terhapus. Konten yang
              sudah dibagikan ke kelas, seperti foto kegiatan, bisa tetap disimpan sebagai arsip kenangan kecuali kamu meminta untuk dihapus.
            </p>
          ),
        },
        {
          id: "perubahan",
          title: "Perubahan kebijakan",
          body: (
            <p>
              Kebijakan ini bisa diperbarui bila ada fitur baru. Perubahan penting akan diumumkan lewat halaman Pengumuman, dan tanggal berlakunya tercantum
              di bagian atas halaman ini. Pertanyaan seputar privasi bisa disampaikan ke {contact}.
            </p>
          ),
        },
      ]}
    />
  );
}
