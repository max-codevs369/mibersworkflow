"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Crop, Minus, Plus, RotateCcw } from "lucide-react";
import Modal from "./Modal";
import { btn, cx } from "@/lib/ui";

const MAX_ZOOM = 5;

const MAX_OUT = 2400;

type View = { z: number; u: number; v: number };
type Req = { file: File; aspect: number; round: boolean; resolve: (f: File | null) => void; id: number };

export async function needsCrop(file: File, aspect: number) {
  if (!file.type.startsWith("image/") || file.type === "image/gif") return false;
  try {
    const bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
    const r = bmp.width / bmp.height;
    bmp.close();
    return Math.abs(Math.log(r / aspect)) > 0.03;
  } catch {
    return false;
  }
}

export function useCropper() {
  const [req, setReq] = useState<Req | null>(null);
  const seq = useRef(0);

  const crop = useCallback(
    (file: File, aspect: number, opts: { round?: boolean } = {}) =>
      new Promise<File | null>((resolve) => setReq({ file, aspect, round: !!opts.round, resolve, id: ++seq.current })),
    []
  );

  const finish = (f: File | null) => {
    req?.resolve(f);
    setReq(null);
  };

  const cropper = req
    ? createPortal(<CropDialog key={req.id} file={req.file} aspect={req.aspect} round={req.round} onDone={finish} />, document.body)
    : null;

  return { crop, cropper };
}

function CropDialog({ file, aspect, round, onDone }: { file: File; aspect: number; round: boolean; onDone: (f: File | null) => void }) {
  const [img, setImg] = useState<{ url: string; w: number; h: number; bmp: ImageBitmap } | null>(null);
  const [failed, setFailed] = useState(false);
  const [view, setView] = useState<View>({ z: 1, u: 0.5, v: 0.5 });
  const [frame, setFrame] = useState({ w: 0, h: 0 });
  const [saving, setSaving] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<number | null>(null);

  useEffect(() => {
    let alive = true;
    let made: { url: string; bmp: ImageBitmap } | null = null;
    createImageBitmap(file, { imageOrientation: "from-image" })
      .then((bmp) => {
        if (!alive) return bmp.close();
        made = { url: URL.createObjectURL(file), bmp };
        setImg({ url: made.url, w: bmp.width, h: bmp.height, bmp });
      })
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
      if (made) {
        URL.revokeObjectURL(made.url);
        made.bmp.close();
      }
    };
  }, [file]);

  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const fit = () => {
      const maxW = el.clientWidth;
      const maxH = Math.min(window.innerHeight * 0.55, 520);
      let w = maxW;
      let h = w / aspect;
      if (h > maxH) {
        h = maxH;
        w = h * aspect;
      }
      setFrame({ w: Math.round(w), h: Math.round(h) });
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, [aspect, img]);

  const base = img && frame.w ? Math.max(frame.w / img.w, frame.h / img.h) : 1;

  const clamp = useCallback(
    (next: View): View => {
      if (!img || !frame.w) return next;
      const z = Math.min(MAX_ZOOM, Math.max(1, next.z));
      const s = base * z;
      const hw = frame.w / s / img.w / 2;
      const hh = frame.h / s / img.h / 2;
      return {
        z,
        u: Math.min(1 - hw, Math.max(hw, next.u)),
        v: Math.min(1 - hh, Math.max(hh, next.v)),
      };
    },
    [img, frame, base]
  );

  const pan = useCallback(
    (dx: number, dy: number) => {
      if (!img) return;
      setView((v) => {
        const s = base * v.z;
        return clamp({ ...v, u: v.u - dx / (img.w * s), v: v.v - dy / (img.h * s) });
      });
    },
    [img, base, clamp]
  );
  const zoomBy = useCallback((f: number) => setView((v) => clamp({ ...v, z: v.z * f })), [clamp]);

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      zoomBy(Math.exp(-e.deltaY * 0.0015));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [zoomBy, img]);

  function onPointerDown(e: React.PointerEvent) {
    e.currentTarget.setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    pinch.current = null;
  }
  function onPointerMove(e: React.PointerEvent) {
    const prev = pointers.current.get(e.pointerId);
    if (!prev) return;
    const cur = { x: e.clientX, y: e.clientY };
    pointers.current.set(e.pointerId, cur);
    if (pointers.current.size >= 2) {
      const [a, b] = [...pointers.current.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      if (pinch.current) zoomBy(dist / pinch.current);
      pinch.current = dist;
    } else {
      pan(cur.x - prev.x, cur.y - prev.y);
    }
  }
  function onPointerUp(e: React.PointerEvent) {
    pointers.current.delete(e.pointerId);
    pinch.current = null;
  }
  function onKeyDown(e: React.KeyboardEvent) {
    const step = e.shiftKey ? 40 : 10;
    const map: Record<string, () => void> = {
      ArrowLeft: () => pan(step, 0),
      ArrowRight: () => pan(-step, 0),
      ArrowUp: () => pan(0, step),
      ArrowDown: () => pan(0, -step),
      "+": () => zoomBy(1.1),
      "=": () => zoomBy(1.1),
      "-": () => zoomBy(1 / 1.1),
    };
    if (map[e.key]) {
      e.preventDefault();
      map[e.key]();
    }
  }

  const cv = clamp(view);

  async function apply() {
    if (!img) return;
    setSaving(true);
    try {
      const s = base * cv.z;
      const cw = frame.w / s;
      const ch = frame.h / s;
      const sx = cv.u * img.w - cw / 2;
      const sy = cv.v * img.h - ch / 2;
      const k = Math.min(1, MAX_OUT / Math.max(cw, ch));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(cw * k));
      canvas.height = Math.max(1, Math.round(ch * k));
      const ctx = canvas.getContext("2d");
      if (!ctx) return onDone(null);
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img.bmp, sx, sy, cw, ch, 0, 0, canvas.width, canvas.height);
      const toBlob = (type: string) => new Promise<Blob | null>((r) => canvas.toBlob(r, type, 0.95));
      let blob = await toBlob("image/webp");
      if (!blob || blob.type !== "image/webp") blob = await toBlob("image/jpeg");
      if (!blob) return onDone(null);
      const ext = blob.type === "image/webp" ? "webp" : "jpg";
      onDone(new File([blob], `${file.name.replace(/\.[^.]+$/, "") || "foto"}.${ext}`, { type: blob.type }));
    } finally {
      setSaving(false);
    }
  }

  const s = base * cv.z;
  const tx = img ? frame.w / 2 - cv.u * img.w * s : 0;
  const ty = img ? frame.h / 2 - cv.v * img.h * s : 0;
  const ratio = aspect === 1 ? "1:1" : Math.abs(aspect - 16 / 9) < 0.01 ? "16:9" : Math.abs(aspect - 4 / 3) < 0.01 ? "4:3" : Math.abs(aspect - 4 / 5) < 0.01 ? "4:5" : null;

  return (
    <Modal
      open
      onClose={() => onDone(null)}
      size="lg"
      title={
        <span className="flex items-center gap-2">
          <Crop size={18} className="text-brand" /> Atur potongan foto
        </span>
      }
      description={`Geser foto untuk memilih bagian yang ditampilkan${ratio ? ` (bingkai ${ratio})` : ""}. Cubit, scroll, atau pakai slider untuk zoom.`}
    >
      <div className="flex flex-col gap-4">
        <div ref={wrapRef} className="flex w-full justify-center">
          {failed ? (
            <p className="py-10 text-center text-sm text-danger">Foto ini tidak bisa dibuka untuk dipotong. Pilih “Pakai apa adanya”.</p>
          ) : (
            <div
              ref={stageRef}
              tabIndex={0}
              role="application"
              aria-label="Area potong foto. Seret atau pakai tombol panah untuk menggeser, plus dan minus untuk zoom."
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
              onKeyDown={onKeyDown}
              onDoubleClick={() => setView((v) => clamp({ ...v, z: cv.z < 2 ? 2 : 1 }))}
              className="relative cursor-grab touch-none select-none overflow-hidden rounded-xl bg-ink outline-none ring-brand focus-visible:ring-2 active:cursor-grabbing"
              style={{ width: frame.w || "100%", height: frame.h || 240 }}
            >
              {img && frame.w > 0 && (
                <img
                  src={img.url}
                  alt=""
                  draggable={false}
                  className="pointer-events-none absolute left-0 top-0 max-w-none origin-top-left"
                  style={{ width: img.w, height: img.h, transform: `translate(${tx}px, ${ty}px) scale(${s})` }}
                />
              )}

              <span aria-hidden className="pointer-events-none absolute inset-0">
                <span className="absolute inset-y-0 left-1/3 border-l border-white/25" />
                <span className="absolute inset-y-0 left-2/3 border-l border-white/25" />
                <span className="absolute inset-x-0 top-1/3 border-t border-white/25" />
                <span className="absolute inset-x-0 top-2/3 border-t border-white/25" />
                {round && <span className="absolute inset-0 rounded-full shadow-[0_0_0_9999px_rgba(0,0,0,0.5)] ring-2 ring-white/70" />}
              </span>
              {!img && !failed && <span className="absolute inset-0 animate-pulse bg-surface-3" />}
            </div>
          )}
        </div>
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => zoomBy(1 / 1.2)} aria-label="Perkecil" className={btn.icon}>
            <Minus size={16} />
          </button>
          <input
            type="range"
            min={1}
            max={MAX_ZOOM}
            step={0.01}
            value={cv.z}
            onChange={(e) => setView((v) => clamp({ ...v, z: Number(e.target.value) }))}
            aria-label="Zoom"
            className="min-w-0 flex-1 accent-[var(--color-brand)]"
          />
          <button type="button" onClick={() => zoomBy(1.2)} aria-label="Perbesar" className={btn.icon}>
            <Plus size={16} />
          </button>
          <button type="button" onClick={() => setView(clamp({ z: 1, u: 0.5, v: 0.5 }))} aria-label="Atur ulang" title="Atur ulang" className={btn.icon}>
            <RotateCcw size={16} />
          </button>
        </div>
        <div className="flex flex-col-reverse gap-2 border-t border-line pt-4 sm:flex-row sm:justify-end">
          <button type="button" onClick={() => onDone(null)} className={btn.ghost}>
            Pakai apa adanya
          </button>
          <button type="button" onClick={apply} disabled={!img || saving} className={cx(btn.primary)}>
            <Crop size={16} /> {saving ? "Memotong…" : "Pakai potongan ini"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
