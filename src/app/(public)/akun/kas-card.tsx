import { ArrowUpRight, CircleCheck, Clock, TriangleAlert, Wallet } from "lucide-react";
import { kasSummary, rupiah } from "@/lib/kas";
import { btn, card, cx } from "@/lib/ui";

const dateFmt = (d: Date) => d.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });

export default async function KasCard({ userId }: { userId: string }) {
  const s = await kasSummary(userId);
  const overdue = !!s && s.overdueCount > 0;

  return (
    <div className={cx(card, "overflow-hidden", overdue && "border-danger/40")}>
      <div className="flex items-center gap-3 border-b border-line bg-surface-2/60 px-5 py-4">
        <span className="grid h-10 w-10 flex-none place-items-center rounded-xl bg-brand/15 text-brand">
          <Wallet size={20} />
        </span>
        <div className="min-w-0">
          <h2 className="font-bold">Kas kelas</h2>
          <p className="text-xs text-muted">Bayar kas, lihat tagihan & unduh kuitansi</p>
        </div>
      </div>
      <div className="grid gap-3 p-5">
        {s ? (
          s.outstanding > 0 ? (
            <>
              <div>
                <p className="text-xs text-muted">Sisa tagihanmu</p>
                <p className={cx("font-display text-2xl font-bold", overdue ? "text-danger" : "text-fg")}>{rupiah(s.outstanding)}</p>
              </div>
              {overdue ? (
                <p className="flex items-start gap-2 text-sm text-danger">
                  <TriangleAlert size={16} className="mt-0.5 flex-none" />
                  {s.overdueCount} tagihan sudah lewat tenggat
                </p>
              ) : s.nextDue ? (
                <p className="flex items-start gap-2 text-sm text-muted">
                  <Clock size={16} className="mt-0.5 flex-none" />
                  Tenggat berikutnya {dateFmt(s.nextDue)}
                </p>
              ) : null}
            </>
          ) : (
            <p className="flex items-center gap-2 text-sm font-medium text-fg">
              <CircleCheck size={18} className="flex-none text-brand" />
              Semua tagihan kas sudah lunas
            </p>
          )
        ) : (
          <p className="text-sm text-muted">Kelola pembayaran kas kelasmu di aplikasi kas.</p>
        )}
        {s && s.pending > 0 && <p className="text-xs text-muted">{rupiah(s.pending)} sedang menunggu verifikasi/pembayaran.</p>}
        <a href="/kas" className={cx(overdue || (s?.outstanding ?? 0) > 0 ? btn.primary : btn.secondary, "w-full")}>
          {s && s.outstanding > 0 ? "Bayar sekarang" : "Buka kas kelas"} <ArrowUpRight size={16} />
        </a>
      </div>
    </div>
  );
}
