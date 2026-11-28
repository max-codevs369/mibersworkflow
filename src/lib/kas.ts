import { prisma } from "@/lib/prisma";

export type KasSummary = {
  outstanding: number;
  openCount: number;
  overdueCount: number;
  nextDue: Date | null;
  pending: number;
};

type Row = { outstanding: bigint; open_count: bigint; overdue_count: bigint; next_due: Date | null; pending: bigint };

export async function kasSummary(userId: string): Promise<KasSummary | null> {
  try {
    const rows = await prisma.$queryRaw<Row[]>`SELECT * FROM finance.member_summary(${userId})`;
    const r = rows[0];
    if (!r) return null;
    return {
      outstanding: Number(r.outstanding),
      openCount: Number(r.open_count),
      overdueCount: Number(r.overdue_count),
      nextDue: r.next_due,
      pending: Number(r.pending),
    };
  } catch {
    return null;
  }
}

export const rupiah = (n: number) => "Rp " + n.toLocaleString("id-ID");
