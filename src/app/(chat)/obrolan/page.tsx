import { Lock, MessagesSquare } from "lucide-react";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";
export const metadata = { title: "Ruang Obrolan", robots: { index: false, follow: false } };

export default async function ChatIndexPage() {
  const settings = await getSettings();
  return (
    <div className="flex h-full flex-col items-center justify-center border-b-[6px] border-wa-green bg-wa-panel/70 px-8 text-center">
      <span className="flex h-24 w-24 items-center justify-center rounded-full bg-wa-active text-wa-green">
        <MessagesSquare size={44} strokeWidth={1.4} />
      </span>
      <h2 className="mt-6 font-sans text-[28px] font-light tracking-normal text-wa-text">Ruang obrolan {settings.site_short || settings.site_name}</h2>
      <p className="mt-3 max-w-md text-sm leading-relaxed text-wa-meta">
        Pilih obrolan di sebelah kiri, atau cari nama teman sekelas dan langsung kirim pesan tanpa perlu menyimpan kontak. Kamu juga bisa membuat grup sendiri dan mengajak teman sekelas.
      </p>
      <p className="mt-10 flex items-center gap-1.5 text-xs text-wa-meta">
        <Lock size={12} /> Hanya untuk anggota kelas yang sudah masuk
      </p>
    </div>
  );
}
