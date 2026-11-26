"use client";

import { useEffect, useRef, useState } from "react";
import { CircleAlert, Crop, ImagePlus, LoaderCircle, Sparkles, X } from "lucide-react";
import { needsCrop, useCropper } from "./PhotoCropper";
import { cx } from "@/lib/ui";
import { MB, MEDIA_LIMITS, formatMB } from "@/lib/media-limits";
import type { VideoJob } from "@/lib/compress-video";

const L = MEDIA_LIMITS;
const QUALITY_STEPS = [0.86, 0.8, 0.74, 0.68, 0.62];

export async function shrink(file: File, maxDim: number, targetBytes = L.imageTargetKB * 1024): Promise<File> {
  if (!file.type.startsWith("image/") || file.type === "image/gif") return file;
  try {
    const bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
    const scale = Math.min(1, maxDim / Math.max(bmp.width, bmp.height));
    if (scale === 1 && file.size <= targetBytes && /^image\/(jpeg|webp)$/.test(file.type)) {
      bmp.close();
      return file;
    }
    const w = Math.round(bmp.width * scale);
    const h = Math.round(bmp.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(bmp, 0, 0, w, h);
    bmp.close();

    const toBlob = (type: string, q: number) => new Promise<Blob | null>((res) => canvas.toBlob(res, type, q));
    const probe = await toBlob("image/webp", QUALITY_STEPS[0]);
    const type = probe?.type === "image/webp" ? "image/webp" : "image/jpeg";
    let blob = type === "image/webp" ? probe : await toBlob(type, QUALITY_STEPS[0]);
    for (const q of QUALITY_STEPS.slice(1)) {
      if (!blob || blob.size <= targetBytes) break;
      blob = (await toBlob(type, q)) ?? blob;
    }
    if (!blob || (scale === 1 && blob.size >= file.size)) return file;
    const base = file.name.replace(/\.[^.]+$/, "") || "foto";
    return new File([blob], `${base}.${type === "image/webp" ? "webp" : "jpg"}`, { type });
  } catch {
    return file;
  }
}

type Item = {
  key: string;
  name: string;
  video: boolean;
  before: number;
  after?: number;
  url?: string;
  file?: File;
  progress?: number;
  working?: boolean;
  error?: string;
};

export default function ImagePicker({
  name,
  label = "Pilih foto",
  multiple = false,
  allowVideo = false,
  defaultUrl,
  removable = false,
  maxDim = L.imageMaxSide,
  hint,
  aspect = "aspect-[4/3]",
  crop,
  cropRound = false,
}: {
  name: string;
  label?: string;
  multiple?: boolean;
  allowVideo?: boolean;
  defaultUrl?: string | null;
  removable?: boolean;
  maxDim?: number;
  hint?: string;
  aspect?: string;

  crop?: number;

  cropRound?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [busy, setBusy] = useState(false);
  const [removed, setRemoved] = useState(false);
  const run = useRef(0);
  const jobs = useRef<VideoJob[]>([]);
  const [source, setSource] = useState<File | null>(null);
  const { crop: openCropper, cropper } = useCropper();
  const canCrop = !!crop && !multiple;

  const urls = items.map((i) => i.url).filter(Boolean).join("|");
  useEffect(() => () => urls.split("|").forEach((u) => u && URL.revokeObjectURL(u)), [urls]);
  useEffect(() => () => jobs.current.forEach((j) => j.cancel()), []);

  const ok = items.filter((i) => i.file);
  const total = ok.reduce((s, i) => s + (i.after ?? 0), 0);
  const tooBig = total > L.requestMB * MB;

  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.setCustomValidity(
      busy
        ? "Tunggu sebentar, file masih dikompres."
        : tooBig
          ? `Total ${formatMB(total)} terlalu besar. Maksimal ${L.requestMB} MB sekali kirim, kirim sebagian dulu.`
          : ""
    );
  }, [busy, tooBig, total]);

  function cancelJobs() {
    jobs.current.forEach((j) => j.cancel());
    jobs.current = [];
  }

  function commit(list: Item[]) {
    const el = inputRef.current;
    if (!el) return;
    try {
      const dt = new DataTransfer();
      list.forEach((i) => i.file && dt.items.add(i.file));
      el.files = dt.files;
    } catch {}
  }

  function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.currentTarget.files ?? []);
    setSource(canCrop ? files.find((f) => f.type.startsWith("image/")) ?? null : null);
    return processFiles(files, false);
  }

  async function processFiles(files: File[], forceCrop: boolean) {
    cancelJobs();
    const id = ++run.current;
    if (files.length === 0) {
      setItems([]);
      return;
    }
    let list: Item[] = files.map((f, i) => ({
      key: `${id}-${i}`,
      name: f.name,
      video: f.type.startsWith("video/") || /\.(mov|mp4|m4v|webm|3gp|mkv)$/i.test(f.name),
      before: f.size,
    }));
    const update = (i: number, patch: Partial<Item>) => {
      if (run.current !== id) return;
      list = list.map((it, k) => (k === i ? { ...it, ...patch } : it));
      setItems(list);
    };
    setItems(list);
    setRemoved(false);
    setBusy(true);

    for (let i = 0; i < files.length; i++) {
      if (run.current !== id) return;
      const f = files[i];
      update(i, { working: true });
      try {
        let out: File;
        if (list[i].video) {
          if (!allowVideo) throw new Error("Video tidak bisa diunggah di sini.");
          update(i, { progress: 0 });
          const { compressVideo } = await import("@/lib/compress-video");
          const job = compressVideo(f, (p) => update(i, { progress: p }));
          jobs.current.push(job);
          out = await job.result;
          if (out.size > L.videoMB * MB) throw new Error(`Hasil video masih ${formatMB(out.size)}; maksimal ${L.videoMB} MB.`);
        } else if (f.type.startsWith("image/")) {
          let src = f;
          if (canCrop && crop && (forceCrop || (await needsCrop(f, crop)))) {
            src = (await openCropper(f, crop, { round: cropRound })) ?? f;
            if (run.current !== id) return;
          }
          out = await shrink(src, maxDim);
          if (out.size > L.imageMB * MB) throw new Error(`Foto terlalu besar (${formatMB(out.size)}); maksimal ${L.imageMB} MB.`);
        } else {
          throw new Error("Jenis file tidak didukung.");
        }
        update(i, { file: out, after: out.size, url: URL.createObjectURL(out), progress: undefined, working: false });
      } catch (err) {
        update(i, { error: err instanceof Error ? err.message : "Gagal memproses file.", progress: undefined, working: false });
      }
    }
    if (run.current !== id) return;
    commit(list);
    setBusy(false);
  }

  function clear() {
    cancelJobs();
    setSource(null);
    run.current++;
    if (inputRef.current) inputRef.current.value = "";
    setItems([]);
    setBusy(false);
  }

  function drop(key: string) {
    const list = items.filter((i) => i.key !== key);
    setItems(list);
    commit(list);
  }

  const showExisting = !multiple && defaultUrl && items.length === 0 && !removed;
  const before = ok.reduce((s, i) => s + i.before, 0);
  const saved = before > 0 ? Math.round((1 - total / before) * 100) : 0;
  const active = items.find((i) => i.working);
  const done = items.filter((i) => i.file || i.error).length;

  return (
    <div
      className="grid min-w-0 gap-2"

      onClick={(e) => {
        const hit = (e.target as HTMLElement).closest("button, input, label, a, video");
        if (!hit || !e.currentTarget.contains(hit)) e.preventDefault();
      }}
    >
      {cropper}
      {showExisting && (
        <div className={cx("relative w-full max-w-sm overflow-hidden rounded-xl border border-line bg-surface-2", aspect)}>
          <img src={defaultUrl} alt="" className="h-full w-full object-cover" />
          {removable && (
            <button
              type="button"
              onClick={() => setRemoved(true)}
              className="absolute right-2 top-2 flex min-h-9 items-center gap-1 rounded-md bg-ink/85 px-2.5 text-xs font-semibold text-fg hover:text-danger"
            >
              <X size={14} /> Hapus gambar
            </button>
          )}
        </div>
      )}
      {removable && removed && <input type="hidden" name={`${name}_remove`} value="1" />}

      {items.length > 0 && (
        <div className={cx("grid gap-2", multiple ? "grid-cols-3 sm:grid-cols-4" : "max-w-sm")}>
          {items.map((it) => (
            <div
              key={it.key}
              className={cx(
                "relative overflow-hidden rounded-lg border bg-surface-2",
                it.error ? "border-danger/60" : "border-line",
                multiple ? "aspect-square" : aspect
              )}
            >
              {it.url && it.video ? (
                <video src={it.url} muted playsInline preload="metadata" className="h-full w-full object-cover" />
              ) : it.url ? (
                <img src={it.url} alt="" className="h-full w-full object-cover" />
              ) : it.error ? (
                <div className="flex h-full flex-col items-center justify-center gap-1 p-2 text-center text-[11px] leading-snug text-danger">
                  <CircleAlert size={18} />
                  <span className="line-clamp-4">{it.error}</span>
                </div>
              ) : (
                <div className="flex h-full flex-col items-center justify-center gap-1.5 p-2 text-center text-[11px] text-muted">
                  <LoaderCircle size={18} className="animate-spin" />
                  {it.progress !== undefined
                    ? `Kompres ${Math.round(it.progress * 100)}%`
                    : it.working
                      ? "Mengompres…"
                      : "Menunggu…"}
                  {it.progress !== undefined && (
                    <span className="h-1 w-4/5 overflow-hidden rounded-full bg-line">
                      <span className="block h-full bg-brand transition-[width]" style={{ width: `${Math.round(it.progress * 100)}%` }} />
                    </span>
                  )}
                </div>
              )}
              {canCrop && !busy && it.file && !it.video && source && (
                <button
                  type="button"
                  onClick={() => processFiles([source], true)}
                  className="absolute right-2 top-2 flex min-h-9 items-center gap-1.5 rounded-md bg-ink/85 px-2.5 text-xs font-semibold text-fg transition hover:text-brand"
                >
                  <Crop size={14} /> Atur potongan
                </button>
              )}
              {it.after !== undefined && (
                <span className="absolute bottom-1 left-1 rounded bg-ink/80 px-1.5 py-0.5 font-mono text-[10px] text-fg">
                  {it.after < it.before ? `${formatMB(it.before)} → ${formatMB(it.after)}` : formatMB(it.after)}
                </span>
              )}
              {multiple && !busy && (it.file || it.error) && (
                <button
                  type="button"
                  onClick={() => drop(it.key)}
                  aria-label={`Hapus ${it.name} dari pilihan`}
                  className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-ink/80 text-fg hover:text-danger"
                >
                  <X size={13} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <label
          className={cx(
            "relative inline-flex min-h-11 cursor-pointer items-center gap-2 overflow-hidden rounded-lg border border-dashed border-line-strong px-4 text-sm font-semibold text-muted transition hover:border-brand hover:text-brand",
            busy && "pointer-events-none opacity-60"
          )}
        >
          {busy ? <LoaderCircle size={18} className="animate-spin" /> : <ImagePlus size={18} />}
          {busy
            ? active
              ? `Mengompres ${done + 1}/${items.length}…`
              : "Memproses..."
            : items.length
              ? "Ganti pilihan"
              : label}
          <input
            ref={inputRef}
            type="file"
            name={name}
            multiple={multiple}
            accept={allowVideo ? "image/*,video/*" : "image/*"}
            onChange={onChange}
            className="sr-only"
          />
        </label>
        {items.length > 0 && (
          <>
            <span className="text-xs text-faint">
              {busy ? `${items.length} file dipilih` : `${ok.length} file · ${formatMB(total)}`}
              {!busy && saved >= 5 && (
                <span className="ml-1 inline-flex items-center gap-0.5 font-semibold text-ok">
                  <Sparkles size={11} /> hemat {saved}%
                </span>
              )}
            </span>
            <button type="button" onClick={clear} className="text-xs font-semibold text-muted hover:text-danger">
              Batalkan
            </button>
          </>
        )}
      </div>
      {tooBig && (
        <p role="alert" className="text-xs font-medium text-danger">
          Total {formatMB(total)} melebihi batas {L.requestMB} MB sekali kirim. Hapus beberapa file lalu kirim sisanya terpisah.
        </p>
      )}
      <p className="text-xs text-faint">
        {hint ? `${hint} ` : ""}
        {allowVideo
          ? `Foto & video otomatis dikompres agar ringan tapi tetap jernih (video jadi 720p, maks ${L.videoMB} MB).`
          : `Foto otomatis dikompres agar ringan tapi tetap jernih.`}
      </p>
    </div>
  );
}
