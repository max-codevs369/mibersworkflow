"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, LoaderCircle, Mic, Play, RotateCcw, Square, Trash2 } from "lucide-react";
import { audioContext, playBlob, playSound, refreshSounds } from "@/lib/sound";
import { MAX_SOUND_SECONDS } from "@/lib/sound-kinds";
import { btn, cx } from "@/lib/ui";
import { resetSound, saveSound } from "./actions";

type Phase = "idle" | "recording" | "processing" | "preview";

const RATE = 22050;

function encodeWav(samples: Float32Array, rate: number): Blob {
  const buf = new ArrayBuffer(44 + samples.length * 2);
  const v = new DataView(buf);
  const str = (o: number, s: string) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
  str(0, "RIFF");
  v.setUint32(4, 36 + samples.length * 2, true);
  str(8, "WAVE");
  str(12, "fmt ");
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true);
  v.setUint16(22, 1, true);
  v.setUint32(24, rate, true);
  v.setUint32(28, rate * 2, true);
  v.setUint16(32, 2, true);
  v.setUint16(34, 16, true);
  str(36, "data");
  v.setUint32(40, samples.length * 2, true);
  samples.forEach((s, i) => v.setInt16(44 + i * 2, Math.max(-1, Math.min(1, s)) * 0x7fff, true));
  return new Blob([buf], { type: "audio/wav" });
}

async function polish(blob: Blob): Promise<{ wav: Blob; seconds: number }> {
  const ctx = audioContext();
  if (!ctx) throw new Error("Browser tidak mendukung audio.");
  const decoded = await ctx.decodeAudioData(await blob.arrayBuffer());
  const length = Math.ceil(decoded.duration * RATE);
  const offline = new OfflineAudioContext(1, Math.max(1, length), RATE);
  const src = offline.createBufferSource();
  src.buffer = decoded;
  src.connect(offline.destination);
  src.start();
  const mono = (await offline.startRendering()).getChannelData(0);

  let peak = 0;
  for (const s of mono) peak = Math.max(peak, Math.abs(s));
  if (peak < 0.01) throw new Error("Suaranya terlalu pelan atau mikrofon tidak menangkap suara. Coba lebih dekat ke mikrofon.");
  const gate = peak * 0.06;
  let start = mono.findIndex((s) => Math.abs(s) > gate);
  let end = mono.length - 1;
  while (end > start && Math.abs(mono[end]) <= gate) end--;
  start = Math.max(0, start - Math.round(RATE * 0.02));
  end = Math.min(mono.length, end + Math.round(RATE * 0.08), start + RATE * MAX_SOUND_SECONDS);

  const out = mono.slice(start, end);
  const gain = 0.9 / peak;
  const fade = Math.min(out.length, Math.round(RATE * 0.04));
  for (let i = 0; i < out.length; i++) {
    let g = gain;
    if (i < 64) g *= i / 64;
    if (i > out.length - fade) g *= (out.length - i) / fade;
    out[i] *= g;
  }
  return { wav: encodeWav(out, RATE), seconds: out.length / RATE };
}

export default function SoundRecorder({ kind, custom }: { kind: string; custom: boolean }) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("idle");
  const [left, setLeft] = useState(MAX_SOUND_SECONDS);
  const [level, setLevel] = useState(0);
  const [result, setResult] = useState<{ wav: Blob; seconds: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [pending, start] = useTransition();
  const stopRef = useRef<() => void>(() => {});

  useEffect(() => () => stopRef.current(), []);

  async function record() {
    setError(null);
    setResult(null);
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
    } catch {
      setError("Izin mikrofon ditolak. Izinkan mikrofon untuk situs ini di pengaturan browser.");
      return;
    }
    const ctx = audioContext();
    if (ctx?.state === "suspended") await ctx.resume().catch(() => {});
    const analyser = ctx?.createAnalyser();
    const source = ctx && analyser ? ctx.createMediaStreamSource(stream) : null;
    if (source && analyser) source.connect(analyser);
    const samples = new Float32Array(1024);

    const recorder = new MediaRecorder(stream);
    const chunks: Blob[] = [];
    recorder.ondataavailable = (e) => {
      if (e.data.size) chunks.push(e.data);
    };

    const began = performance.now();
    let raf = 0;
    const tick = () => {
      const elapsed = (performance.now() - began) / 1000;
      setLeft(Math.max(0, Math.ceil(MAX_SOUND_SECONDS - elapsed)));
      if (analyser) {
        analyser.getFloatTimeDomainData(samples);
        let sum = 0;
        for (const s of samples) sum += s * s;
        setLevel(Math.min(1, Math.sqrt(sum / samples.length) * 6));
      }
      if (elapsed >= MAX_SOUND_SECONDS) return stop();
      raf = requestAnimationFrame(tick);
    };
    const stop = () => {
      cancelAnimationFrame(raf);
      if (recorder.state !== "inactive") recorder.stop();
    };
    stopRef.current = stop;

    recorder.onstop = async () => {
      stream.getTracks().forEach((t) => t.stop());
      source?.disconnect();
      setLevel(0);
      setPhase("processing");
      try {
        const done = await polish(new Blob(chunks, { type: recorder.mimeType }));
        setResult(done);
        setPhase("preview");
        playBlob(done.wav).catch(() => {});
      } catch (e) {
        setError(e instanceof Error ? e.message : "Rekaman gagal diproses.");
        setPhase("idle");
      }
    };

    recorder.start();
    setPhase("recording");
    raf = requestAnimationFrame(tick);
  }

  function save() {
    if (!result) return;
    const fd = new FormData();
    fd.set("kind", kind);
    fd.set("file", new File([result.wav], `${kind}.wav`, { type: "audio/wav" }));
    start(async () => {
      const r = await saveSound(fd);
      if (r.error) return setError(r.error);
      refreshSounds();
      setResult(null);
      setPhase("idle");
      router.refresh();
    });
  }

  function reset() {
    if (!confirmReset) return setConfirmReset(true);
    setConfirmReset(false);
    start(async () => {
      const r = await resetSound(kind);
      if (r.error) return setError(r.error);
      refreshSounds();
      router.refresh();
    });
  }

  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap items-center gap-2">
        {phase === "recording" ? (
          <button type="button" onClick={() => stopRef.current()} className={cx(btn.smDanger, "min-w-36")}>
            <Square size={14} className="fill-current" /> Selesai ({left})
          </button>
        ) : (
          <button type="button" onClick={record} disabled={phase === "processing" || pending} className={cx(btn.smPrimary, "min-w-36")}>
            {phase === "processing" ? <LoaderCircle size={15} className="animate-spin" /> : <Mic size={15} />}
            {phase === "processing" ? "Mengolah…" : result ? "Rekam ulang" : "Rekam suara"}
          </button>
        )}
        {phase !== "recording" && !result && (
          <button type="button" onClick={() => playSound(kind, true)} className={btn.sm}>
            <Play size={14} /> Dengar
          </button>
        )}
        {custom && !result && phase === "idle" && (
          <button type="button" onClick={reset} disabled={pending} className={confirmReset ? btn.smDanger : btn.sm}>
            {confirmReset ? <Trash2 size={14} /> : <RotateCcw size={14} />} {confirmReset ? "Yakin pakai bawaan?" : "Pakai bawaan"}
          </button>
        )}
      </div>

      {phase === "recording" && (
        <div className="flex items-center gap-3">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-danger opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-danger" />
          </span>
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-2">
            <div className="h-full rounded-full bg-brand transition-[width] duration-75" style={{ width: `${Math.round(level * 100)}%` }} />
          </div>
          <span className="text-xs text-muted tabular-nums">maks {MAX_SOUND_SECONDS} detik</span>
        </div>
      )}

      {result && phase === "preview" && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-brand/40 bg-brand/5 p-2">
          <span className="text-sm text-muted">Hasil rekaman {result.seconds.toFixed(1)} detik</span>
          <button type="button" onClick={() => playBlob(result.wav)} className={btn.sm}>
            <Play size={14} /> Putar
          </button>
          <button type="button" onClick={save} disabled={pending} className={btn.smPrimary}>
            {pending ? <LoaderCircle size={14} className="animate-spin" /> : <Check size={14} />} Simpan
          </button>
          <button
            type="button"
            onClick={() => {
              setResult(null);
              setPhase("idle");
            }}
            className={btn.sm}
          >
            Batal
          </button>
        </div>
      )}

      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  );
}
