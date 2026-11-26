"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft, ArrowRight, Ban, Camera, Check, CheckCheck, LoaderCircle, MessageSquarePlus, MessagesSquare, Search, Users, UsersRound, X } from "lucide-react";
import { createGroupChat, openDirect } from "@/app/(chat)/obrolan/actions";
import MemberSelect from "./MemberSelect";
import { shrink } from "@/components/ui/ImagePicker";
import { needsCrop, useCropper } from "@/components/ui/PhotoCropper";
import { Avatar } from "@/components/ui/bits";
import GroupAvatar from "./GroupAvatar";
import { listTime } from "@/lib/chat";
import { cx } from "@/lib/ui";

export type ChatSummary = {
  id: string;
  type: "DIRECT" | "GROUP";
  title: string;
  image: string | null;
  seed: string;
  at: string;
  unread: number;
  last: { name: string; text: string; mine: boolean; system: boolean; deleted: boolean; status: "sent" | "delivered" | "read" } | null;
};

export type Person = { id: string; name: string; image: string | null; role: string; chatId: string | null };

type Tab = "all" | "unread" | "group" | "direct";
const TABS: [Tab, string][] = [
  ["all", "Semua"],
  ["unread", "Belum dibaca"],
  ["group", "Grup"],
  ["direct", "Pribadi"],
];

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

export default function ChatList({ chats, people }: { chats: ChatSummary[]; people: Person[] }) {
  const pathname = usePathname();
  const [q, setQ] = useState("");
  const [tab, setTab] = useState<Tab>("all");
  const [mode, setMode] = useState<"list" | "direct" | "group-pick" | "group-name">("list");
  const [pq, setPq] = useState("");
  const [members, setMembers] = useState<string[]>([]);
  const [groupName, setGroupName] = useState("");
  const [groupError, setGroupError] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const { crop, cropper } = useCropper();
  const [creating, startCreate] = useTransition();
  const pickInput = useRef<HTMLInputElement>(null);
  const picking = mode !== "list";
  const setPicking = (on: boolean) => setMode(on ? "direct" : "list");
  const [lastPath, setLastPath] = useState(pathname);
  if (lastPath !== pathname) {
    setLastPath(pathname);
    setMode("list");
    setMembers([]);
    setGroupName("");
    setGroupError("");
    setPhoto(null);
    setPhotoUrl(null);
  }

  function createGroup() {
    setGroupError("");
    startCreate(async () => {
      const fd = new FormData();
      fd.set("title", groupName);
      members.forEach((id) => fd.append("members", id));
      if (photo) fd.set("photo", photo);
      const res = await createGroupChat(fd);
      if (res?.error) setGroupError(res.error);
    });
  }

  const term = norm(q.trim());
  const shownChats = useMemo(
    () =>
      chats.filter((c) => {
        if (tab === "unread" && c.unread === 0) return false;
        if (tab === "group" && c.type !== "GROUP") return false;
        if (tab === "direct" && c.type !== "DIRECT") return false;
        return !term || norm(c.title).includes(term) || (c.last && norm(c.last.text).includes(term));
      }),
    [chats, tab, term]
  );
  const peopleHits = useMemo(
    () => (term ? people.filter((p) => !p.chatId && norm(p.name).includes(term)).slice(0, 20) : []),
    [people, term]
  );
  const pterm = norm(pq.trim());
  const pickList = useMemo(() => people.filter((p) => !pterm || norm(p.name).includes(pterm)), [people, pterm]);
  const unreadTotal = chats.reduce((n, c) => n + (c.unread > 0 ? 1 : 0), 0);

  if (mode === "group-pick" || mode === "group-name") {
    const backTo = mode === "group-pick" ? "direct" : "group-pick";
    return (
      <>
        <header className="flex h-[60px] flex-none items-center gap-4 bg-wa-panel px-4">
          <button
            type="button"
            onClick={() => setMode(backTo)}
            aria-label="Kembali"
            className="flex h-10 w-10 items-center justify-center rounded-full text-wa-meta hover:text-wa-text"
          >
            <ArrowLeft size={22} />
          </button>
          <div className="min-w-0">
            <h2 className="font-sans text-[17px] font-medium tracking-normal text-wa-text">
              {mode === "group-pick" ? "Tambah anggota grup" : "Grup baru"}
            </h2>
            <p className="text-xs text-wa-meta">
              {mode === "group-pick" ? `${members.length} dipilih dari ${people.length}` : `${members.length + 1} anggota termasuk kamu`}
            </p>
          </div>
        </header>
        {mode === "group-pick" ? (
          <div className="relative flex min-h-0 flex-1 flex-col pt-2">
            <MemberSelect people={people} selected={members} onChange={setMembers} autoFocus />
            {members.length > 0 && (
              <button
                type="button"
                onClick={() => setMode("group-name")}
                aria-label="Lanjut"
                className="absolute bottom-5 right-5 flex h-14 w-14 items-center justify-center rounded-full bg-wa-green text-wa-bg shadow-lg shadow-black/40 transition hover:brightness-110 active:scale-95"
              >
                <ArrowRight size={24} />
              </button>
            )}
          </div>
        ) : (
          <form
            className="relative flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-6 py-8"
            onSubmit={(e) => {
              e.preventDefault();
              createGroup();
            }}
          >
            <div className="flex items-center gap-4">
              <span className="relative flex-none">
                <label className="group relative flex h-16 w-16 cursor-pointer items-center justify-center overflow-hidden rounded-full bg-wa-panel text-wa-meta transition hover:brightness-110">
                  {photoUrl ? (
                    <img src={photoUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <Camera size={24} />
                  )}
                  <span className="sr-only">Pilih foto grup</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    onChange={async (e) => {
                      const f = e.target.files?.[0];
                      e.target.value = "";
                      if (!f) return;
                      const cut = (await needsCrop(f, 1)) ? await crop(f, 1, { round: true }) : null;
                      const small = await shrink(cut ?? f, 640);
                      setPhoto(small);
                      setPhotoUrl((old) => {
                        if (old) URL.revokeObjectURL(old);
                        return URL.createObjectURL(small);
                      });
                    }}
                  />
                </label>
                {photoUrl && (
                  <button
                    type="button"
                    onClick={() => {
                      setPhoto(null);
                      setPhotoUrl((old) => {
                        if (old) URL.revokeObjectURL(old);
                        return null;
                      });
                    }}
                    aria-label="Hapus foto"
                    className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-wa-active text-wa-text shadow"
                  >
                    <X size={13} />
                  </button>
                )}
              </span>
              <label className="min-w-0 flex-1">
                <span className="sr-only">Nama grup</span>
                <input
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  maxLength={60}
                  autoFocus
                  required
                  placeholder="Nama grup"
                  className="w-full border-b-2 border-wa-green bg-transparent py-2 text-[17px] text-wa-text outline-none placeholder:text-wa-meta"
                />
                <span className="mt-1 block text-right text-xs text-wa-meta">{groupName.length}/60</span>
              </label>
            </div>
            <div>
              <p className="mb-2 text-sm text-wa-green">Anggota · {members.length + 1}</p>
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full bg-wa-panel px-3 py-1 text-sm text-wa-text">Kamu</span>
                {members.map((id) => {
                  const p = people.find((x) => x.id === id);
                  return p ? (
                    <span key={id} className="rounded-full bg-wa-panel px-3 py-1 text-sm text-wa-text">
                      {p.name.split(" ")[0]}
                    </span>
                  ) : null;
                })}
              </div>
              <p className="mt-3 text-xs leading-relaxed text-wa-meta">
                Kamu jadi pengelola grup: bisa menambah dan mengeluarkan anggota, serta mengganti nama grup.
              </p>
            </div>
            {groupError && (
              <p role="alert" className="rounded-lg bg-danger/15 px-3 py-2 text-sm text-danger">
                {groupError}
              </p>
            )}

            <button
              type="submit"
              disabled={creating || groupName.trim().length < 2}
              aria-label="Buat grup"
              className="mt-auto flex h-14 w-14 flex-none items-center justify-center self-center rounded-full bg-wa-green text-wa-bg shadow-lg shadow-black/40 transition hover:brightness-110 active:scale-95 disabled:opacity-40"
            >
              {creating ? <LoaderCircle size={24} className="animate-spin" /> : <Check size={26} />}
            </button>
          </form>
        )}
      </>
    );
  }

  if (picking) {
    return (
      <>
        <header className="flex h-[60px] flex-none items-center gap-4 bg-wa-panel px-4">
          <button
            type="button"
            onClick={() => {
              setPicking(false);
              setPq("");
            }}
            aria-label="Kembali"
            className="flex h-10 w-10 items-center justify-center rounded-full text-wa-meta hover:text-wa-text"
          >
            <ArrowLeft size={22} />
          </button>
          <h2 className="font-sans text-[17px] font-medium tracking-normal text-wa-text">Chat baru</h2>
        </header>
        <div className="flex-none px-3 py-2">
          <SearchBox inputRef={pickInput} value={pq} onChange={setPq} placeholder="Cari nama anggota" autoFocus />
        </div>
        {!pq && (
          <button
            type="button"
            onClick={() => setMode("group-pick")}
            className="flex flex-none items-center gap-3 pl-3 text-left transition hover:bg-wa-panel"
          >
            <span className="flex h-11 w-11 flex-none items-center justify-center rounded-full bg-wa-green text-wa-bg">
              <Users size={20} />
            </span>
            <span className="flex-1 border-b border-wa-line py-4 text-[16px] text-wa-text">Grup baru</span>
          </button>
        )}
        <p className="flex-none px-5 pb-2 pt-3 text-sm text-wa-green">Anggota kelas · {people.length}</p>
        <nav aria-label="Pilih anggota" className="wa-scroll min-h-0 flex-1 overflow-y-auto">
          {pickList.length === 0 ? (
            <Empty text="Tidak ada anggota dengan nama itu." />
          ) : (
            <ul>
              {pickList.map((p) => (
                <li key={p.id}>
                  <PersonRow person={p} />
                </li>
              ))}
            </ul>
          )}
        </nav>
      </>
    );
  }

  return (
    <>
      {cropper}
      <header className="flex h-[60px] flex-none items-center justify-between gap-3 px-4">
        <h1 className="font-sans text-[22px] font-bold tracking-normal text-wa-text">Obrolan</h1>
        <span className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setMode("group-pick")}
            aria-label="Grup baru"
            title="Grup baru"
            className="flex h-10 w-10 items-center justify-center rounded-full text-wa-meta transition hover:bg-wa-panel hover:text-wa-text"
          >
            <UsersRound size={21} />
          </button>
          <button
            type="button"
            onClick={() => setPicking(true)}
            aria-label="Chat baru"
            title="Chat baru"
            className="flex h-10 w-10 items-center justify-center rounded-full text-wa-meta transition hover:bg-wa-panel hover:text-wa-text"
          >
            <MessageSquarePlus size={21} />
          </button>
        </span>
      </header>
      <div className="flex-none px-3 pb-2">
        <SearchBox value={q} onChange={setQ} placeholder="Cari obrolan atau nama anggota" />
        <div className="no-scrollbar mt-2.5 flex gap-2 overflow-x-auto">
          {TABS.map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              aria-pressed={tab === key}
              className={cx(
                "flex-none rounded-full px-3 py-1 text-sm transition",
                tab === key ? "bg-wa-green/20 text-wa-pill" : "bg-wa-panel text-wa-meta hover:text-wa-text"
              )}
            >
              {label}
              {key === "unread" && unreadTotal > 0 && <span className="ml-1 tabular-nums">{unreadTotal}</span>}
            </button>
          ))}
        </div>
      </div>
      <nav aria-label="Daftar obrolan" className="wa-scroll min-h-0 flex-1 overflow-y-auto">
        {shownChats.length === 0 && peopleHits.length === 0 ? (
          chats.length === 0 && !term ? (
            <div className="flex flex-col items-center px-8 py-14 text-center text-wa-meta">
              <MessagesSquare size={36} strokeWidth={1.5} />
              <p className="mt-3 text-sm">Belum ada obrolan. Cari nama teman di kolom pencarian, lalu langsung kirim pesan.</p>
              <button
                type="button"
                onClick={() => setPicking(true)}
                className="mt-5 rounded-full bg-wa-green px-5 py-2 text-sm font-semibold text-wa-bg transition hover:brightness-110"
              >
                Mulai chat
              </button>
            </div>
          ) : (
            <Empty text={term ? `Tidak ada hasil untuk “${q.trim()}”.` : "Tidak ada obrolan di sini."} />
          )
        ) : (
          <>
            {term && shownChats.length > 0 && <Heading>Obrolan</Heading>}
            <ul>
              {shownChats.map((c) => (
                <li key={c.id}>
                  <ChatRow chat={c} active={pathname === `/obrolan/${c.id}`} />
                </li>
              ))}
            </ul>
            {peopleHits.length > 0 && (
              <>
                <Heading>Anggota</Heading>
                <ul>
                  {peopleHits.map((p) => (
                    <li key={p.id}>
                      <PersonRow person={p} />
                    </li>
                  ))}
                </ul>
              </>
            )}
          </>
        )}
      </nav>
    </>
  );
}

function ChatRow({ chat: c, active }: { chat: ChatSummary; active: boolean }) {
  const last = c.last;
  return (
    <Link
      href={`/obrolan/${c.id}`}
      aria-current={active ? "page" : undefined}
      className={cx("flex items-center gap-3 pl-3 transition", active ? "bg-wa-active" : "hover:bg-wa-panel")}
    >
      {c.type === "GROUP" ? <GroupAvatar id={c.id} title={c.title} size={49} src={c.image} /> : <Avatar name={c.title} src={c.image} size={49} />}
      <span className="flex min-w-0 flex-1 flex-col justify-center border-b border-wa-line py-3 pr-4">
        <span className="flex items-baseline justify-between gap-2">
          <span className="truncate text-[16px] text-wa-text">{c.title}</span>
          <span className={cx("flex-none text-xs", c.unread > 0 ? "text-wa-green" : "text-wa-meta")} suppressHydrationWarning>
            {listTime(c.at)}
          </span>
        </span>
        <span className="mt-0.5 flex items-center gap-1 text-sm text-wa-meta">
          {last?.mine && !last.system && !last.deleted &&
            (last.status === "sent" ? (
              <Check size={15} className="flex-none text-wa-meta" aria-label="Terkirim" />
            ) : (
              <CheckCheck
                size={16}
                className={cx("flex-none", last.status === "read" ? "text-wa-tick" : "text-wa-meta")}
                aria-label={last.status === "read" ? "Dibaca" : "Sudah sampai"}
              />
            ))}
          {last?.deleted && <Ban size={14} className="flex-none" />}
          <span className={cx("truncate", last?.deleted && "italic")}>
            {!last ? (
              <span className="italic">{c.type === "GROUP" ? "Grup baru" : "Belum ada pesan"}</span>
            ) : last.system ? (
              last.text
            ) : (
              <>
                {c.type === "GROUP" && !last.mine && !last.deleted && `${last.name}: `}
                {last.text}
              </>
            )}
          </span>
          {c.unread > 0 && (
            <span className="ml-auto flex h-5 min-w-5 flex-none items-center justify-center rounded-full bg-wa-green px-1.5 text-[11px] font-semibold text-wa-bg">
              {c.unread > 99 ? "99+" : c.unread}
            </span>
          )}
        </span>
      </span>
    </Link>
  );
}

function PersonRow({ person: p }: { person: Person }) {
  const [pending, start] = useTransition();
  const body = (
    <>
      <Avatar name={p.name} src={p.image} size={44} />
      <span className="flex min-w-0 flex-1 flex-col border-b border-wa-line py-3 pr-4 text-left">
        <span className="truncate text-[16px] text-wa-text">{p.name}</span>
        <span className="truncate text-sm text-wa-meta">{p.role}</span>
      </span>
      {pending && <LoaderCircle size={18} className="mr-4 animate-spin text-wa-meta" />}
    </>
  );
  const cls = "flex w-full items-center gap-3 pl-3 transition hover:bg-wa-panel";
  if (p.chatId) {
    return (
      <Link href={`/obrolan/${p.chatId}`} className={cls}>
        {body}
      </Link>
    );
  }
  return (
    <button type="button" disabled={pending} onClick={() => start(() => openDirect(p.id))} className={cls}>
      {body}
    </button>
  );
}

function SearchBox({
  value,
  onChange,
  placeholder,
  autoFocus,
  inputRef,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  autoFocus?: boolean;
  inputRef?: React.RefObject<HTMLInputElement | null>;
}) {
  return (
    <label className="flex h-10 items-center gap-3 rounded-lg bg-wa-panel px-3 text-wa-meta focus-within:ring-1 focus-within:ring-wa-green/60">
      <Search size={17} aria-hidden />
      <span className="sr-only">{placeholder}</span>
      <input
        ref={inputRef}
        type="search"
        value={value}
        autoFocus={autoFocus}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="min-w-0 flex-1 bg-transparent text-[15px] text-wa-text outline-none placeholder:text-wa-meta [&::-webkit-search-cancel-button]:hidden"
      />
      {value && (
        <button type="button" onClick={() => onChange("")} aria-label="Hapus pencarian" className="text-wa-meta hover:text-wa-text">
          <X size={16} />
        </button>
      )}
    </label>
  );
}

function Heading({ children }: { children: React.ReactNode }) {
  return <p className="px-5 pb-1 pt-4 text-sm font-medium text-wa-green">{children}</p>;
}

function Empty({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-center px-8 py-14 text-center text-wa-meta">
      <Users size={34} strokeWidth={1.5} />
      <p className="mt-3 text-sm">{text}</p>
    </div>
  );
}
