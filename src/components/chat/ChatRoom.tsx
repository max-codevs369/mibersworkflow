"use client";

import { Fragment, useEffect, useLayoutEffect, useOptimistic, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowDown,
  ArrowLeft,
  Ban,
  Check,
  CheckCheck,
  Eraser,
  ChevronDown,
  Clock3,
  Copy,
  Info,
  Lock,
  LogOut,
  MoreVertical,
  SendHorizontal,
  Smile,
  Trash2,
  Pencil,
  UserMinus,
  UserPlus,
  LoaderCircle,
  Camera,
  Reply,
  X,
} from "lucide-react";
import {
  addGroupMembers,
  updateGroupPhoto,
  clearChat,
  deleteMessage,
  leaveGroup,
  markRead,
  removeGroupMember,
  renameGroup,
  sendMessage,
} from "@/app/(chat)/obrolan/actions";
import MemberSelect, { type Pickable } from "./MemberSelect";
import ChatPulse from "./ChatPulse";
import { shrink } from "@/components/ui/ImagePicker";
import { needsCrop, useCropper } from "@/components/ui/PhotoCropper";
import ConfirmButton from "@/components/ui/ConfirmButton";
import Modal from "@/components/ui/Modal";
import { Avatar } from "@/components/ui/bits";
import GroupAvatar from "./GroupAvatar";
import SwipeReply from "./SwipeReply";
import { clock, dayLabel, isEmojiOnly, nameTone, sameDay } from "@/lib/chat";
import { cx, readableTone } from "@/lib/ui";

export type ChatMessage = {
  id: string;
  kind: "TEXT" | "SYSTEM";
  authorId: string;
  name: string;
  image: string | null;
  text: string;
  at: string;
  deleted: boolean;
  pending?: boolean;
  reply?: ReplyRef | null;
};

export type ReplyRef = { id: string; authorId: string; name: string; text: string; deleted: boolean };

const SELF_TONE = "#06cf9c";

type Member = { id: string; name: string; image: string | null; role: string };

type Props = {
  chat: {
    id: string;
    group: boolean;
    title: string;
    description: string | null;
    image: string | null;
    seed: string;
    otherRole: string | null;
    createdAt: string;
  };
  members: Member[];
  messages: ChatMessage[];
  truncated: boolean;
  readUpTo: string;
  deliveredUpTo: string;
  me: { id: string; name: string; image: string | null };
  moderator: boolean;
  creatorId: string | null;
  canManage: boolean;
  candidates: Pickable[];
};

const EMOJI = ["😀", "😂", "🤣", "😊", "😍", "🥰", "😎", "🤔", "😅", "😭", "🥺", "😡", "👍", "👏", "🙏", "💪", "🔥", "✨", "🎉", "❤️", "💯", "✅", "📚", "☕"];
const RUN_GAP = 5 * 60_000;

export default function ChatRoom({
  chat,
  members,
  messages,
  truncated,
  readUpTo,
  deliveredUpTo,
  me,
  moderator,
  creatorId,
  canManage,
  candidates,
}: Props) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [addSel, setAddSel] = useState<string[]>([]);
  const [editing, setEditing] = useState(false);
  const [gName, setGName] = useState(chat.title);
  const [gDesc, setGDesc] = useState(chat.description ?? "");
  const [manageErr, setManageErr] = useState("");
  const [managing, startManage] = useTransition();
  const { crop, cropper } = useCropper();

  function manage(run: () => Promise<{ error?: string; ok?: true }>, done?: () => void) {
    setManageErr("");
    startManage(async () => {
      const res = await run();
      if (res?.error) return setManageErr(res.error);
      done?.();
      router.refresh();
    });
  }
  const [draft, setDraft] = useState("");
  const [replyTo, setReplyTo] = useState<ReplyRef | null>(null);
  const [error, setError] = useState("");
  const [menu, setMenu] = useState<string | null>(null);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [info, setInfo] = useState(false);
  const [sending, startSend] = useTransition();
  const [list, addMessage] = useOptimistic(messages, (s, m: ChatMessage) => [...s, m]);

  const scroller = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const prevCount = useRef(list.length);
  const readFor = useRef<string | null>(null);
  const [atBottom, setAtBottom] = useState(true);
  const [seen, setSeen] = useState(list.length);

  const lastId = list[list.length - 1]?.id ?? "empty";

  useLayoutEffect(() => {
    const el = scroller.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, []);

  useEffect(() => {
    const el = scroller.current;
    const added = list.length - prevCount.current;
    prevCount.current = list.length;
    if (!el || added <= 0) return;
    const mine = list[list.length - 1]?.authorId === me.id;
    if (mine || el.scrollHeight - el.scrollTop - el.clientHeight < 160) {
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    }
  }, [list, me.id]);

  useEffect(() => {
    const run = () => {
      if (document.visibilityState !== "visible" || lastId.startsWith("tmp-") || readFor.current === lastId) return;
      readFor.current = lastId;
      markRead(chat.id)
        .then(() => router.refresh())
        .catch(() => {});
    };
    run();
    document.addEventListener("visibilitychange", run);
    return () => document.removeEventListener("visibilitychange", run);
  }, [lastId, chat.id, router]);

  useEffect(() => {
    if (!menu && !emojiOpen) return;
    const onDown = (e: PointerEvent) => {
      const t = e.target as Element;
      if (menu && !t.closest(`[data-menu="${menu}"]`)) setMenu(null);
      if (emojiOpen && !t.closest("[data-emoji]")) setEmojiOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMenu(null);
        setEmojiOpen(false);
      }
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [menu, emojiOpen]);

  function grow() {
    const el = input.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 140)}px`;
  }

  function startReply(m: ChatMessage) {
    if (m.pending || m.deleted || m.kind !== "TEXT") return;
    setReplyTo({ id: m.id, authorId: m.authorId, name: m.name, text: m.text.slice(0, 300), deleted: false });
    setMenu(null);
    requestAnimationFrame(() => input.current?.focus());
  }

  function jumpTo(id: string) {
    const el = document.getElementById(`msg-${id}`);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.animate?.(
      [{ backgroundColor: "rgb(0 168 132 / 0.28)" }, { backgroundColor: "rgb(0 168 132 / 0.28)", offset: 0.5 }, { backgroundColor: "transparent" }],
      { duration: 1600, easing: "ease-out" }
    );
  }

  function send() {
    const text = draft.trim();
    if (!text || sending) return;
    if (text.length > 2000) return setError("Pesan maksimal 2000 karakter.");
    const reply = replyTo;
    setDraft("");
    setReplyTo(null);
    setError("");
    setEmojiOpen(false);
    requestAnimationFrame(grow);
    startSend(async () => {
      addMessage({
        id: `tmp-${Date.now()}`,
        kind: "TEXT",
        authorId: me.id,
        name: me.name,
        image: me.image,
        text,
        at: new Date().toISOString(),
        deleted: false,
        pending: true,
        reply,
      });
      const res = await sendMessage(chat.id, text, reply?.id ?? null);
      if (res?.error) {
        setError(res.error);
        setDraft((d) => d || text);

        if (reply && !/dibalas/.test(res.error)) setReplyTo((r) => r ?? reply);
      }
    });
  }

  function insertEmoji(e: string) {
    const el = input.current;
    const start = el?.selectionStart ?? draft.length;
    const end = el?.selectionEnd ?? draft.length;
    setDraft(draft.slice(0, start) + e + draft.slice(end));
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(start + e.length, start + e.length);
      grow();
    });
  }

  const others = members.filter((m) => m.id !== me.id);
  const subtitle = chat.group
    ? [...others.map((m) => m.name.split(" ")[0]).slice(0, 10), "Kamu"].join(", ")
    : chat.otherRole ?? "";
  const unseen = !atBottom ? list.length - seen : 0;
  const avatar = (size: number) =>
    chat.group ? <GroupAvatar id={chat.id} title={chat.title} size={size} src={chat.image} /> : <Avatar name={chat.title} src={chat.image} size={size} />;

  return (
    <div className="flex h-full min-h-0 flex-col">
      {cropper}
      <ChatPulse room={chat.id} interval={1500} />
      <header className="relative z-20 flex h-[60px] flex-none items-center gap-2 bg-wa-panel px-2 sm:gap-3 sm:px-4">
        <Link
          href="/obrolan"
          aria-label="Kembali ke daftar obrolan"
          className="flex h-10 w-10 flex-none items-center justify-center rounded-full text-wa-meta hover:text-wa-text lg:hidden"
        >
          <ArrowLeft size={22} />
        </Link>
        <button type="button" onClick={() => setInfo(true)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
          {avatar(40)}
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[16px] font-medium leading-tight text-wa-text">{chat.title}</span>
            <span className="block truncate text-[13px] text-wa-meta">{subtitle}</span>
          </span>
        </button>
        <div className="relative" data-menu="__head">
          <button
            type="button"
            onClick={() => setMenu(menu === "__head" ? null : "__head")}
            aria-label="Menu obrolan"
            aria-expanded={menu === "__head"}
            className={cx(
              "flex h-10 w-10 items-center justify-center rounded-full text-wa-meta transition hover:text-wa-text",
              menu === "__head" && "bg-wa-active text-wa-text"
            )}
          >
            <MoreVertical size={20} />
          </button>
          {menu === "__head" && (
            <div className="absolute right-0 top-12 w-56 animate-drop rounded-md bg-wa-menu py-2 shadow-xl shadow-black/50">
              <MenuItem
                icon={<Info size={17} />}
                label={chat.group ? "Info grup" : "Info kontak"}
                onClick={() => {
                  setInfo(true);
                  setMenu(null);
                }}
              />
              <ConfirmButton
                action={async () => {
                  const res = await clearChat(chat.id);
                  if (res && "ok" in res) {
                    setMenu(null);
                    router.refresh();
                  }
                  return res;
                }}
                title={chat.group ? "Bersihkan chat ini?" : "Hapus chat ini?"}
                description={
                  chat.group
                    ? "Semua pesan di grup ini akan hilang dari layarmu saja. Anggota lain tetap bisa melihatnya."
                    : "Chat dan riwayat pesannya hilang dari daftarmu saja. Akan muncul lagi kalau ada pesan baru."
                }
                confirmLabel={chat.group ? "Bersihkan" : "Hapus chat"}
                className="flex w-full items-center gap-3 px-5 py-2.5 text-left text-[14.5px] text-wa-text hover:bg-wa-bg/60"
              >
                <span className="text-wa-meta">
                  <Eraser size={17} />
                </span>
                {chat.group ? "Bersihkan chat" : "Hapus chat"}
              </ConfirmButton>
              {chat.group && (
                <ConfirmButton
                  action={() => leaveGroup(chat.id)}
                  title="Keluar dari grup?"
                  description="Kamu tidak akan menerima pesan dari grup ini lagi. Untuk bergabung kembali, minta pembuat grup atau pengurus menambahkanmu."
                  confirmLabel="Keluar"
                  className="flex w-full items-center gap-3 px-5 py-2.5 text-left text-[14.5px] text-[#f15c6d] hover:bg-wa-bg/60"
                >
                  <LogOut size={17} /> Keluar dari grup
                </ConfirmButton>
              )}
            </div>
          )}
        </div>
      </header>
      <div className="relative min-h-0 flex-1">
        <div
          ref={scroller}
          onScroll={(e) => {
            const el = e.currentTarget;
            const bottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
            setAtBottom(bottom);
            if (bottom) setSeen(list.length);
          }}
          className="wa-wall wa-scroll h-full overflow-y-auto overscroll-contain px-3 pb-4 pt-2 sm:px-[6%]"
          aria-live="polite"
          aria-relevant="additions"
        >
          <p className="mx-auto mb-3 mt-2 flex max-w-md items-start gap-2 rounded-lg bg-wa-chip px-3 py-2 text-center text-[12.5px] leading-snug text-wa-notice">
            <Lock size={13} className="mt-0.5 flex-none" />
            <span>
              {chat.group
                ? "Hanya anggota grup yang bisa membaca dan mengirim pesan di sini."
                : "Obrolan pribadi. Hanya kamu dan lawan bicaramu yang bisa membacanya."}
            </span>
          </p>
          {truncated && (
            <p className="mx-auto mb-2 w-fit rounded-lg bg-wa-chip px-3 py-1 text-xs text-wa-meta">Menampilkan 300 pesan terakhir</p>
          )}

          {list.length === 0 && (
            <p className="mx-auto mt-6 w-fit max-w-[90%] rounded-lg bg-wa-chip px-4 py-2 text-center text-[13px] text-wa-meta">
              Belum ada pesan. Sapa {chat.group ? "grup ini" : chat.title.split(" ")[0]} duluan 👋
            </p>
          )}

          {list.map((m, i) => {
            const prev = list[i - 1];
            const newDay = !prev || !sameDay(prev.at, m.at);

            if (m.kind === "SYSTEM") {
              return (
                <Fragment key={m.id}>
                  {newDay && <DayChip at={m.at} />}
                  <p className="mx-auto my-2 w-fit max-w-[90%] rounded-lg bg-wa-chip px-3 py-1 text-center text-[12.5px] text-wa-meta">
                    {m.text}
                  </p>
                </Fragment>
              );
            }

            const runStart =
              newDay ||
              prev.kind === "SYSTEM" ||
              prev.authorId !== m.authorId ||
              new Date(m.at).getTime() - new Date(prev.at).getTime() > RUN_GAP;
            const mine = m.authorId === me.id;
            const canDelete = !m.pending && !m.deleted && (mine || moderator);
            const nearEnd = i >= list.length - 3 && list.length > 4;
            const emoji = !m.deleted && isEmojiOnly(m.text);
            const read = mine && !m.pending && m.at <= readUpTo;
            const delivered = mine && !m.pending && m.at <= deliveredUpTo;

            return (
              <Fragment key={m.id}>
                {newDay && <DayChip at={m.at} />}
                <SwipeReply
                  id={`msg-${m.id}`}
                  onReply={() => startReply(m)}
                  disabled={m.pending || m.deleted}
                  className={cx("flex items-start rounded-lg", mine ? "justify-end" : "justify-start", runStart ? "mt-2.5" : "mt-0.5")}
                >
                  {!mine && chat.group && (
                    <div className="mr-1.5 w-7 flex-none">{runStart && <Avatar name={m.name} src={m.image} size={28} />}</div>
                  )}

                  <div
                    data-menu={m.id}
                    className={cx(
                      "group relative min-w-[84px] max-w-[82%] rounded-lg px-2 pb-[7px] pt-1.5 text-[14.5px] leading-[20px] sm:max-w-[68%] lg:max-w-[60%]",
                      emoji ? "bg-transparent" : mine ? "bg-wa-out" : "bg-wa-in",
                      !emoji && "shadow-[0_1px_0.5px_rgba(11,20,26,.13)]",
                      runStart && !emoji && (mine ? "rounded-tr-none" : "rounded-tl-none")
                    )}
                  >
                    {runStart && !emoji && <Tail mine={mine} />}

                    {!mine && chat.group && runStart && (
                      <p className="mb-0.5 truncate pr-6 text-[13px] font-medium leading-5" style={{ color: readableTone(nameTone(m.authorId)) }}>
                        {m.name}
                      </p>
                    )}

                    {m.reply && !m.deleted && (
                      <QuoteBlock
                        reply={m.reply}
                        meId={me.id}
                        className={cx("mb-1", emoji ? "bg-wa-in" : "")}
                        onClick={() => m.reply && jumpTo(m.reply.id)}
                      />
                    )}

                    {m.deleted ? (
                      <p className="flex items-center gap-1.5 italic text-wa-meta">
                        <Ban size={14} className="flex-none" />
                        {mine ? "Kamu menghapus pesan ini" : "Pesan ini telah dihapus"}
                        <span aria-hidden className="inline-block w-[40px]" />
                      </p>
                    ) : emoji ? (
                      <p className="pb-4 text-[44px] leading-[1.15]">{m.text}</p>
                    ) : (
                      <p className="prose-safe whitespace-pre-wrap text-wa-text">
                        <Linkified text={m.text} />
                        <span aria-hidden className={cx("inline-block", mine ? "w-[66px]" : "w-[44px]")} />
                      </p>
                    )}

                    <span
                      className={cx(
                        "absolute bottom-[3px] right-2 flex items-center gap-[3px] text-[11px] leading-4",
                        mine ? "text-wa-outmeta" : "text-wa-meta",
                        emoji && "rounded-full bg-wa-chip/90 px-1.5"
                      )}
                      suppressHydrationWarning
                    >
                      {clock(m.at)}
                      {mine &&
                        !m.deleted &&
                        (m.pending ? (
                          <Clock3 size={12} aria-label="Mengirim" />
                        ) : (
                          read || delivered ? (
                            <CheckCheck
                              size={16}
                              className={read ? "text-wa-tick" : "text-wa-outmeta"}
                              aria-label={read ? "Dibaca" : "Sudah sampai"}
                            />
                          ) : (
                            <Check size={15} className="text-wa-outmeta" aria-label="Terkirim" />
                          )
                        ))}
                    </span>
                    {!m.pending && !m.deleted && (
                      <button
                        type="button"
                        onClick={() => setMenu(menu === m.id ? null : m.id)}
                        aria-label="Opsi pesan"
                        aria-expanded={menu === m.id}
                        className={cx(
                          "absolute right-1 top-1 flex h-6 w-7 items-center justify-center rounded-full text-wa-meta transition",
                          "opacity-0 focus:opacity-100 group-hover:opacity-100 [@media(hover:none)]:opacity-60",
                          mine ? "bg-wa-out" : emoji ? "bg-wa-chip" : "bg-wa-in",
                          menu === m.id && "opacity-100"
                        )}
                      >
                        <ChevronDown size={18} />
                      </button>
                    )}

                    {menu === m.id && (
                      <div
                        className={cx(
                          "absolute z-30 w-52 animate-drop rounded-md bg-wa-menu py-2 shadow-xl shadow-black/50",
                          mine ? "right-0" : "left-0",
                          nearEnd ? "bottom-8" : "top-8"
                        )}
                      >
                        <MenuItem icon={<Reply size={17} />} label="Balas" onClick={() => startReply(m)} />
                        <MenuItem
                          icon={<Copy size={17} />}
                          label="Salin pesan"
                          onClick={() => {
                            navigator.clipboard?.writeText(m.text).catch(() => {});
                            setMenu(null);
                          }}
                        />
                        {canDelete && (
                          <ConfirmButton
                            action={() => deleteMessage(m.id)}
                            title="Hapus pesan?"
                            description="Pesan akan dihapus untuk semua orang di obrolan ini."
                            confirmLabel="Hapus"
                            className="flex w-full items-center gap-3 px-5 py-2.5 text-left text-[14.5px] text-[#f15c6d] hover:bg-wa-bg/60"
                          >
                            <Trash2 size={17} /> Hapus untuk semua
                          </ConfirmButton>
                        )}
                      </div>
                    )}
                  </div>
                </SwipeReply>
              </Fragment>
            );
          })}
        </div>
        {!atBottom && (
          <button
            type="button"
            onClick={() => scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" })}
            aria-label="Ke pesan terbaru"
            className="absolute bottom-4 right-4 flex h-11 w-11 items-center justify-center rounded-full bg-wa-panel text-wa-meta shadow-lg shadow-black/40 transition hover:text-wa-text"
          >
            <ArrowDown size={20} />
            {unseen > 0 && (
              <span className="absolute -right-1 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-wa-green px-1 text-[11px] font-semibold text-wa-bg">
                {unseen}
              </span>
            )}
          </button>
        )}
      </div>
      <div className="relative flex-none bg-wa-panel px-2 py-2 sm:px-4">
        {error && (
          <p role="alert" className="mx-auto mb-2 w-fit max-w-full rounded-lg bg-danger/15 px-3 py-1.5 text-sm text-danger">
            {error}
          </p>
        )}
        {replyTo && (
          <div className="mb-2 flex animate-drop items-center gap-2 sm:ml-[50px] sm:mr-[50px]">
            <QuoteBlock reply={replyTo} meId={me.id} className="flex-1 bg-wa-active" onClick={() => jumpTo(replyTo.id)} />
            <button
              type="button"
              onClick={() => {
                setReplyTo(null);
                input.current?.focus();
              }}
              aria-label="Batal membalas"
              className="flex h-9 w-9 flex-none items-center justify-center rounded-full text-wa-meta transition hover:bg-wa-active hover:text-wa-text"
            >
              <X size={20} />
            </button>
          </div>
        )}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
          className="flex items-end gap-2"
        >
          <div className="relative flex-none" data-emoji>
            <button
              type="button"
              onClick={() => setEmojiOpen((o) => !o)}
              aria-label="Pilih emoji"
              aria-expanded={emojiOpen}
              className={cx(
                "flex h-[42px] w-[42px] items-center justify-center rounded-full text-wa-meta transition hover:text-wa-text",
                emojiOpen && "text-wa-green"
              )}
            >
              <Smile size={24} />
            </button>
            {emojiOpen && (
              <div className="absolute bottom-[52px] left-0 z-30 grid w-[min(304px,calc(100vw-2rem))] animate-drop grid-cols-6 gap-1 rounded-xl bg-wa-menu p-2 shadow-xl shadow-black/50 sm:grid-cols-8">
                {EMOJI.map((e) => (
                  <button
                    key={e}
                    type="button"
                    onClick={() => insertEmoji(e)}
                    className="flex h-10 items-center justify-center rounded-lg text-[22px] transition hover:bg-wa-bg/60"
                  >
                    {e}
                  </button>
                ))}
              </div>
            )}
          </div>
          <label className="flex min-h-[42px] min-w-0 flex-1 items-center rounded-lg bg-wa-active px-3 py-[9px]">
            <span className="sr-only">Tulis pesan</span>
            <textarea
              ref={input}
              rows={1}
              value={draft}
              maxLength={2000}
              onChange={(e) => {
                setDraft(e.target.value);
                grow();
              }}
              onKeyDown={(e) => {
                if (e.key === "Escape" && replyTo) {
                  e.preventDefault();
                  setReplyTo(null);
                  return;
                }
                const desktop = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
                if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing && desktop) {
                  e.preventDefault();
                  send();
                }
              }}
              placeholder="Ketik pesan"
              className="wa-scroll block max-h-[140px] w-full resize-none bg-transparent text-[15px] leading-6 text-wa-text outline-none placeholder:text-wa-meta"
            />
          </label>
          <button
            type="submit"
            disabled={!draft.trim()}
            aria-label="Kirim pesan"
            className="flex h-[42px] w-[42px] flex-none items-center justify-center rounded-full bg-wa-green text-wa-bg transition hover:brightness-110 active:scale-95 disabled:bg-transparent disabled:text-wa-meta"
          >
            <SendHorizontal size={21} />
          </button>
        </form>
      </div>
      <Modal open={info} onClose={() => setInfo(false)} title={chat.group ? "Info grup" : "Info kontak"} size="sm">
        <div className="flex flex-col items-center text-center">
          {chat.group && canManage ? (
            <div className="flex flex-col items-center gap-2">
              <label className="group relative block cursor-pointer rounded-full" title="Ganti foto grup">
                {avatar(96)}
                <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/55 text-white opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100">
                  {managing ? <LoaderCircle size={24} className="animate-spin" /> : <Camera size={24} />}
                </span>
                <span className="sr-only">Ganti foto grup</span>
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  disabled={managing}
                  onChange={async (e) => {
                    const f = e.target.files?.[0];
                    e.target.value = "";
                    if (!f) return;
                    const cut = (await needsCrop(f, 1)) ? await crop(f, 1, { round: true }) : null;
                    const small = await shrink(cut ?? f, 640);
                    const fd = new FormData();
                    fd.set("photo", small);
                    manage(() => updateGroupPhoto(chat.id, fd));
                  }}
                />
              </label>
              {chat.image && (
                <button
                  type="button"
                  disabled={managing}
                  onClick={() => {
                    const fd = new FormData();
                    fd.set("remove", "1");
                    manage(() => updateGroupPhoto(chat.id, fd));
                  }}
                  className="text-xs font-medium text-muted hover:text-danger"
                >
                  Hapus foto
                </button>
              )}
            </div>
          ) : (
            avatar(96)
          )}
          {editing ? (
            <form
              className="mt-4 grid w-full gap-2 text-left"
              onSubmit={(e) => {
                e.preventDefault();
                manage(() => renameGroup(chat.id, gName, gDesc), () => setEditing(false));
              }}
            >
              <input
                value={gName}
                onChange={(e) => setGName(e.target.value)}
                maxLength={60}
                required
                autoFocus
                aria-label="Nama grup"
                className="w-full rounded-lg border border-line-strong bg-surface-2 px-3 py-2 font-semibold outline-none focus:border-brand"
              />
              <textarea
                value={gDesc}
                onChange={(e) => setGDesc(e.target.value)}
                maxLength={500}
                rows={2}
                placeholder="Deskripsi grup (opsional)"
                aria-label="Deskripsi grup"
                className="w-full resize-none rounded-lg border border-line-strong bg-surface-2 px-3 py-2 text-sm outline-none focus:border-brand"
              />
              <span className="flex justify-end gap-2">
                <button type="button" onClick={() => setEditing(false)} className="rounded-lg px-3 py-1.5 text-sm text-muted hover:text-fg">
                  Batal
                </button>
                <button type="submit" disabled={managing} className="rounded-lg bg-brand px-3 py-1.5 text-sm font-semibold text-ink disabled:opacity-50">
                  Simpan
                </button>
              </span>
            </form>
          ) : (
            <>
              <p className="mt-3 flex items-center gap-2 text-xl font-semibold">
                {chat.title}
                {chat.group && canManage && (
                  <button
                    type="button"
                    onClick={() => setEditing(true)}
                    aria-label="Ubah nama grup"
                    className="flex h-8 w-8 items-center justify-center rounded-md text-muted hover:bg-surface-2 hover:text-fg"
                  >
                    <Pencil size={15} />
                  </button>
                )}
              </p>
              <p className="text-sm text-muted">{chat.group ? `Grup · ${members.length} anggota` : chat.otherRole}</p>
              {chat.description && <p className="prose-safe mt-3 whitespace-pre-line text-sm text-fg">{chat.description}</p>}
            </>
          )}
        </div>
        {manageErr && (
          <p role="alert" className="mt-4 rounded-lg bg-danger/10 px-3 py-2 text-sm font-medium text-danger">
            {manageErr}
          </p>
        )}
        {chat.group && (
          <>
            <div className="mt-6 flex items-center justify-between gap-2">
              <p className="text-sm font-medium text-muted">{members.length} anggota</p>
              {canManage && !adding && candidates.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setAdding(true);
                    setAddSel([]);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-wa-green px-3 py-1.5 text-sm font-semibold text-wa-bg transition hover:brightness-110"
                >
                  <UserPlus size={15} /> Tambah anggota
                </button>
              )}
            </div>
            {adding && (
              <div className="mt-3 overflow-hidden rounded-xl border border-wa-line bg-wa-list">
                <div className="flex h-[22rem] flex-col pt-2">
                  <MemberSelect people={candidates} selected={addSel} onChange={setAddSel} autoFocus />
                </div>
                <div className="flex items-center justify-end gap-2 border-t border-wa-line bg-wa-panel px-3 py-2.5">
                  <button type="button" onClick={() => setAdding(false)} className="rounded-lg px-3 py-1.5 text-sm text-wa-meta hover:text-wa-text">
                    Batal
                  </button>
                  <button
                    type="button"
                    disabled={!addSel.length || managing}
                    onClick={() =>
                      manage(
                        () => addGroupMembers(chat.id, addSel),
                        () => {
                          setAdding(false);
                          setAddSel([]);
                        }
                      )
                    }
                    className="inline-flex items-center gap-1.5 rounded-lg bg-wa-green px-3 py-1.5 text-sm font-semibold text-wa-bg disabled:opacity-40"
                  >
                    {managing && <LoaderCircle size={14} className="animate-spin" />}
                    Tambahkan {addSel.length > 0 && `(${addSel.length})`}
                  </button>
                </div>
              </div>
            )}

            <ul className="mt-2 max-h-72 overflow-y-auto">
              {members.map((m) => {
                const removable = canManage && m.id !== me.id && (m.id !== creatorId || moderator);
                return (
                  <li key={m.id} className="flex items-center gap-3 border-b border-line py-2.5 last:border-0">
                    <Avatar name={m.name} src={m.image} size={38} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{m.id === me.id ? "Kamu" : m.name}</span>
                      <span className="block truncate text-xs text-muted">{m.role}</span>
                    </span>
                    {m.id === creatorId && (
                      <span className="flex-none rounded-full border border-wa-green/50 px-2 py-0.5 text-[11px] font-medium text-wa-green">Pengelola</span>
                    )}
                    {removable && (
                      <ConfirmButton
                        action={async () => {
                          const res = await removeGroupMember(chat.id, m.id);
                          if (!res?.error) router.refresh();
                          return res;
                        }}
                        title={`Keluarkan ${m.name.split(" ")[0]}?`}
                        description="Dia tidak akan bisa membaca atau mengirim pesan di grup ini lagi."
                        confirmLabel="Keluarkan"
                        ariaLabel={`Keluarkan ${m.name}`}
                        className="flex h-8 w-8 flex-none items-center justify-center rounded-md text-muted hover:bg-surface-2 hover:text-danger"
                      >
                        <UserMinus size={15} />
                      </ConfirmButton>
                    )}
                  </li>
                );
              })}
            </ul>
            <p className="mt-4 text-xs text-faint">
              {canManage
                ? "Kamu bisa menambah, mengeluarkan anggota, dan mengganti nama grup."
                : "Pembuat grup dan pengurus yang bisa menambah atau mengeluarkan anggota."}
            </p>
          </>
        )}
      </Modal>
    </div>
  );
}

function DayChip({ at }: { at: string }) {
  return (
    <div className="sticky top-2 z-10 my-3 flex justify-center">
      <span className="rounded-lg bg-wa-chip px-3 py-1 text-[12.5px] text-wa-meta shadow-sm shadow-black/30" suppressHydrationWarning>
        {dayLabel(at)}
      </span>
    </div>
  );
}

function Tail({ mine }: { mine: boolean }) {
  return mine ? (
    <svg viewBox="0 0 8 13" width="8" height="13" aria-hidden className="absolute -right-2 top-0 text-wa-out">
      <path fill="currentColor" d="M5.188 1H0v11.193l6.467-8.625C7.526 2.156 6.958 1 5.188 1z" />
    </svg>
  ) : (
    <svg viewBox="0 0 8 13" width="8" height="13" aria-hidden className="absolute -left-2 top-0 text-wa-in">
      <path fill="currentColor" d="M1.533 3.568 8 12.193V1H2.812C1.042 1 .474 2.156 1.533 3.568z" />
    </svg>
  );
}

function QuoteBlock({
  reply,
  meId,
  onClick,
  className,
}: {
  reply: ReplyRef;
  meId: string;
  onClick: () => void;
  className?: string;
}) {
  const self = reply.authorId === meId;
  const tone = self ? SELF_TONE : nameTone(reply.authorId);
  return (
    <button
      type="button"
      onClick={onClick}
      title="Lihat pesan yang dibalas"
      className={cx(
        "flex w-full min-w-[150px] overflow-hidden rounded-md bg-wa-quote text-left transition hover:brightness-95 sm:min-w-[200px]",
        className
      )}
    >
      <span aria-hidden className="w-1 flex-none" style={{ backgroundColor: tone }} />
      <span className="min-w-0 flex-1 px-2 py-1">
        <span className="block truncate text-[13px] font-medium leading-5" style={{ color: readableTone(tone) }}>
          {self ? "Kamu" : reply.name}
        </span>
        <span className="line-clamp-2 break-words text-[13px] leading-[18px] text-wa-meta">
          {reply.deleted ? (
            <span className="inline-flex items-center gap-1 italic">
              <Ban size={12} /> Pesan ini telah dihapus
            </span>
          ) : (
            reply.text
          )}
        </span>
      </span>
    </button>
  );
}

function MenuItem({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 px-5 py-2.5 text-left text-[14.5px] text-wa-text transition hover:bg-wa-bg/60"
    >
      <span className="text-wa-meta">{icon}</span>
      {label}
    </button>
  );
}

function Linkified({ text }: { text: string }) {
  const parts = text.split(/(https?:\/\/[^\s<]+[^\s<.,:;"')\]!?])/g);
  return (
    <>
      {parts.map((p, i) =>
        i % 2 ? (
          <a key={i} href={p} target="_blank" rel="noopener noreferrer nofollow" className="break-all text-wa-tick underline-offset-2 hover:underline">
            {p}
          </a>
        ) : (
          <Fragment key={i}>{p}</Fragment>
        )
      )}
    </>
  );
}
