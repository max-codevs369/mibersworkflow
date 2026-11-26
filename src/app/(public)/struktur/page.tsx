import Link from "next/link";
import { Network } from "lucide-react";
import { prisma } from "@/lib/prisma";
import PageHeader, { container } from "@/components/PageHeader";
import SafeImg from "@/components/ui/SafeImg";
import { EmptyState } from "@/components/ui/bits";
import { buildOrgTree, type OrgNode } from "@/lib/orgtree";
import { chip, cx } from "@/lib/ui";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Struktur Organisasi",
  description: "Struktur organisasi dan pengurus kelas Mibers Duo Anam.",
  alternates: { canonical: "/struktur" },
  openGraph: { title: "Struktur Organisasi", description: "Struktur organisasi dan pengurus kelas Mibers Duo Anam.", url: "/struktur" },
};

type Member = {
  id: string;
  positionId: string;
  userId: string | null;
  displayName: string | null;
  photoUrl: string | null;
  user: { displayName: string; image: string | null } | null;
};

export default async function StructurePage({ searchParams }: { searchParams: Promise<{ periode?: string }> }) {
  const sp = await searchParams;
  const periods = await prisma.organizationPeriod.findMany({ orderBy: [{ isActive: "desc" }, { startYear: "desc" }] });
  const period = periods.find((p) => p.id === sp.periode) ?? periods.find((p) => p.isActive) ?? periods[0];

  const [positions, members] = period
    ? await Promise.all([
        prisma.position.findMany({ select: { id: true, title: true, level: true, sortOrder: true, parentId: true } }),
        prisma.organizationMember.findMany({
          where: { periodId: period.id },
          orderBy: [{ sortOrder: "asc" }],
          select: {
            id: true,
            positionId: true,
            userId: true,
            displayName: true,
            photoUrl: true,
            user: { select: { displayName: true, image: true } },
          },
        }),
      ])
    : [[], []];

  const tree = buildOrgTree<Member>(positions, members);

  return (
    <>
      <PageHeader
        crumbs={[{ label: "Kelas" }, { label: "Struktur organisasi" }]}
        eyebrow={period ? `${period.startYear}/${period.endYear}` : "Kepengurusan"}
        title="Struktur organisasi"
        description={period ? `Orang-orang yang mengurus kelas kita selama ${period.name.toLowerCase()}.` : "Susunan pengurus kelas."}
      />

      <section className={cx(container, "pt-8")}>
        {periods.length > 1 && (
          <div className="no-scrollbar -mx-4 mb-8 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:justify-center sm:px-0">
            {periods.map((p) => (
              <Link key={p.id} href={`/struktur?periode=${p.id}`} className={chip(p.id === period?.id)}>
                {p.name}
                {p.isActive && <span className="text-[11px] opacity-75">· sekarang</span>}
              </Link>
            ))}
          </div>
        )}

        {tree.length === 0 ? (
          <EmptyState icon={<Network size={30} />} title="Struktur belum diisi">
            Susunan pengurus akan tampil di sini setelah diisi oleh admin.
          </EmptyState>
        ) : (
          <div className="org-board relative rounded-2xl border border-line">
            <div className="org-list px-4 py-7 md:hidden">
              <ul>
                {tree.map((n) => (
                  <MobileBranch key={n.position.id} node={n} />
                ))}
              </ul>
            </div>
            <div className="wa-scroll hidden overflow-x-auto px-6 pb-12 pt-14 md:block">
              <div className="org-tree mx-auto w-max min-w-full">
                <ul>
                  {tree.map((n) => (
                    <Branch key={n.position.id} node={n} />
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}
      </section>
    </>
  );
}

function tilt(id: string) {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) | 0;
  return `${((Math.abs(h) % 9) - 4) * 0.55}deg`;
}

function Photo({ m, name, className }: { m: Member | null; name: string; className?: string }) {
  return (
    <span className={cx("block overflow-hidden bg-surface-3", className)}>
      {m ? (
        <SafeImg
          src={m.photoUrl || m.user?.image}
          alt={name}
          className="h-full w-full object-cover"
          fallback={
            <span className="flex h-full w-full items-center justify-center text-3xl font-bold text-faint">{name.charAt(0).toUpperCase()}</span>
          }
        />
      ) : (
        <span className="flex h-full w-full items-center justify-center text-2xl text-faint">?</span>
      )}
    </span>
  );
}

function Branch({ node }: { node: OrgNode<Member> }) {
  const top = node.depth === 0;
  const people = node.members.length ? node.members : [null];
  return (
    <li style={{ ["--d" as string]: node.depth }}>
      <div className="org-node flex justify-center gap-4">
        {people.map((m, i) => {
          const name = m ? m.displayName || m.user?.displayName || "—" : "Belum diisi";
          return (
            <figure
              key={m?.id ?? i}
              style={{ ["--r" as string]: tilt(m?.id ?? node.position.id) }}
              className={cx("polaroid group relative", top ? "w-[12.5rem]" : "w-[10rem]", !m && "opacity-70")}
            >
              <span aria-hidden className={cx("tape", top && "tape-brand")} />
              <Photo m={m} name={name} className="aspect-square w-full" />
              <figcaption className="px-1 pb-1 pt-3 text-center">
                {m?.userId ? (
                  <Link
                    href={`/anggota/${m.userId}`}
                    title={name}
                    className="prose-safe line-clamp-2 font-semibold leading-snug after:absolute after:inset-0 group-hover:underline group-hover:decoration-brand group-hover:decoration-2 group-hover:underline-offset-4"
                  >
                    {name}
                  </Link>
                ) : (
                  <span title={name} className={cx("prose-safe line-clamp-2 leading-snug", m ? "font-semibold" : "text-faint")}>
                    {name}
                  </span>
                )}
                <span className={cx("mt-1 block text-[13px] leading-tight", top ? "text-brand" : "text-muted")}>{node.position.title}</span>
              </figcaption>
            </figure>
          );
        })}
      </div>
      {node.children.length > 0 && (
        <ul>
          {node.children.map((c) => (
            <Branch key={c.position.id} node={c} />
          ))}
        </ul>
      )}
    </li>
  );
}

function MobileBranch({ node }: { node: OrgNode<Member> }) {
  const top = node.depth === 0;
  const people = node.members.length ? node.members : [null];
  return (
    <li style={{ ["--d" as string]: node.depth }}>
      <div className="grid gap-3">
        {people.map((m, i) => {
          const name = m ? m.displayName || m.user?.displayName || "—" : "Belum diisi";
          const inner = (
            <>
              <span className="polaroid polaroid-sm relative flex-none" style={{ ["--r" as string]: tilt(m?.id ?? node.position.id) }}>
                <Photo m={m} name={name} className="h-14 w-14" />
              </span>
              <span className="min-w-0 flex-1">
                <span className={cx("prose-safe block font-semibold leading-snug", !m && "font-normal text-faint")}>{name}</span>
                <span className={cx("mt-0.5 block text-[13px]", top ? "text-brand" : "text-muted")}>{node.position.title}</span>
              </span>
            </>
          );
          const cls = "flex items-center gap-4 py-1";
          return m?.userId ? (
            <Link key={m.id} href={`/anggota/${m.userId}`} className={cx(cls, "group")}>
              {inner}
            </Link>
          ) : (
            <div key={m?.id ?? i} className={cls}>
              {inner}
            </div>
          );
        })}
      </div>
      {node.children.length > 0 && (
        <ul className={cx(node.children.length > 1 && "org-fork")}>
          {node.children.map((c) => (
            <MobileBranch key={c.position.id} node={c} />
          ))}
        </ul>
      )}
    </li>
  );
}
