import LegalDoc from "@/components/LegalDoc";
import { getSettings } from "@/lib/settings";

export const metadata = {
  title: "Ketentuan Layanan",
  description: "Aturan main memakai situs kelas: akun, konten, obrolan, dan moderasi.",
  alternates: { canonical: "/ketentuan" },
};

export default async function TermsPage() {
  const s = await getSettings();

  return (
    <LegalDoc
      title="Ketentuan Layanan"
      description={`Aturan main agar ${s.site_name} tetap nyaman, aman, dan seru untuk semua anggota.`}
      updated="25 November 2026"
      other={{ href: "/privasi", label: "Kebijakan Privasi" }}
      summary={[
        "Akun hanya dibuat oleh pengurus dan khusus untuk anggota kelas. Jaga kata sandimu sendiri.",
        "Sopan itu wajib: tidak ada SARA, perundungan, pornografi, atau penyebaran data pribadi orang lain.",
        "Unggah foto orang lain hanya kalau mereka tidak keberatan.",
        "Pengurus berhak menyembunyikan atau menghapus konten yang melanggar, dan menonaktifkan akun bila perlu.",
      ]}
      sections={[
        {
          id: "lingkup",
          title: "Tentang layanan ini",
          body: (
            <p>
              {s.site_name} adalah situs internal kelas
              {s.department ? ` Jurusan ${s.department.replace(/^jurusan\s+/i, "")}` : ""}
              {s.school_name ? `${s.department ? "," : ""} ${s.school_name}` : ""} untuk berbagi pengumuman, agenda, materi, catatan,
              foto kenangan, dan obrolan. Situs ini dikelola secara sukarela oleh pengurus kelas, bukan layanan komersial. Dengan memakai situs ini, kamu
              setuju mengikuti ketentuan di halaman ini.
            </p>
          ),
        },
        {
          id: "akun",
          title: "Akun dan keamanan",
          body: (
            <ul>
              <li>Akun dibuat oleh pengurus untuk anggota kelas. Tidak ada pendaftaran terbuka.</li>
              <li>Satu akun untuk satu orang. Jangan pinjamkan akunmu atau memakai akun orang lain.</li>
              <li>Kamu bertanggung jawab atas aktivitas yang terjadi di akunmu. Segera ganti kata sandi bila merasa akunmu dipakai orang lain.</li>
              <li>Pengurus dapat menonaktifkan akun yang melanggar ketentuan atau sudah tidak lagi menjadi anggota kelas.</li>
            </ul>
          ),
        },
        {
          id: "konten",
          title: "Aturan konten",
          body: (
            <>
              <p>Saat menulis catatan, mengirim pesan, atau mengunggah foto, kamu dilarang membagikan:</p>
              <ul>
                <li>Ujaran kebencian, SARA, ancaman, perundungan, atau hinaan terhadap siapa pun.</li>
                <li>Konten pornografi, kekerasan berlebihan, atau hal ilegal.</li>
                <li>Data pribadi orang lain tanpa izin, seperti nomor HP, alamat, atau foto memalukan.</li>
                <li>Spam, promosi berlebihan, tautan berbahaya, atau penipuan.</li>
                <li>Kebohongan yang sengaja dibuat untuk menipu atau meresahkan kelas.</li>
              </ul>
              <p>Situs memakai penyaring kata otomatis. Kata yang dilarang membuat kiriman ditolak.</p>
            </>
          ),
        },
        {
          id: "foto",
          title: "Foto, video, dan hak cipta",
          body: (
            <ul>
              <li>Unggah hanya foto atau video yang kamu ambil sendiri, atau yang sudah diizinkan pemiliknya.</li>
              <li>Hormati orang yang ada di foto. Bila seseorang meminta fotonya dihapus, pengurus akan menghapusnya.</li>
              <li>Dengan mengunggah, kamu mengizinkan foto itu ditampilkan di situs kelas. Kamu tetap pemilik karyamu.</li>
              <li>Materi kuliah yang dibagikan hanya untuk belajar bersama di kelas. Jangan disebarkan untuk kepentingan komersial.</li>
            </ul>
          ),
        },
        {
          id: "obrolan",
          title: "Ruang obrolan",
          body: (
            <ul>
              <li>Chat pribadi bisa dimulai dengan anggota mana pun. Gunakan dengan sopan, dan jangan mengganggu orang yang tidak ingin dihubungi.</li>
              <li>Setiap anggota boleh membuat grup. Pembuat grup dan pengurus bisa menambah atau mengeluarkan anggota grup.</li>
              <li>Jangan menambahkan orang ke grup untuk mengganggu atau menyebar spam.</li>
              <li>Pengurus dapat menghapus pesan yang melanggar aturan di grup.</li>
              <li>Ada batas jumlah pesan per menit untuk mencegah spam.</li>
            </ul>
          ),
        },
        {
          id: "larangan",
          title: "Tindakan yang dilarang",
          body: (
            <ul>
              <li>Mencoba membobol akun, sistem, atau mengakses data yang bukan hakmu.</li>
              <li>Mengambil data situs secara massal (scraping) atau membanjiri server dengan permintaan.</li>
              <li>Menyamar sebagai pengurus, anggota lain, atau pihak kampus.</li>
              <li>Mencari dan memanfaatkan celah keamanan. Bila menemukannya, laporkan ke pengurus dan jangan disebarkan.</li>
            </ul>
          ),
        },
        {
          id: "moderasi",
          title: "Moderasi dan sanksi",
          body: (
            <p>
              Pengurus berhak menunda, menyembunyikan, atau menghapus konten yang melanggar, memblokir perangkat yang mengirim spam, dan menonaktifkan akun.
              Untuk pelanggaran serius, pengurus dapat meneruskannya ke dosen wali atau pihak kampus. Setiap tindakan pengurus tercatat di log aktivitas.
            </p>
          ),
        },
        {
          id: "batasan",
          title: "Batasan tanggung jawab",
          body: (
            <p>
              Situs ini disediakan apa adanya oleh pengurus kelas. Kami berusaha menjaganya tetap berjalan dan aman, tetapi tidak menjamin situs selalu bebas
              gangguan. Informasi resmi akademik tetap mengacu pada pengumuman kampus. Isi yang dikirim anggota menjadi tanggung jawab pengirimnya.
            </p>
          ),
        },
        {
          id: "perubahan",
          title: "Perubahan ketentuan",
          body: (
            <p>
              Ketentuan ini bisa diperbarui sewaktu-waktu. Perubahan penting akan diumumkan lewat halaman Pengumuman. Dengan tetap memakai situs setelah
              perubahan, kamu dianggap menyetujui ketentuan yang baru.
            </p>
          ),
        },
      ]}
    />
  );
}
