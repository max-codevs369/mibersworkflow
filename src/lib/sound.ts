"use client";

const KEY = "m26-sound";
let ctx: AudioContext | null = null;
let armed = false;
let manifest: { at: number; kinds: Record<string, number> } | null = null;
let manifestLoad: Promise<Record<string, number>> | null = null;
const buffers = new Map<string, Promise<AudioBuffer | null>>();

function context(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return null;
    ctx = new Ctx();
  }
  return ctx;
}

export function soundEnabled(): boolean {
  try {
    return localStorage.getItem(KEY) !== "off";
  } catch {
    return true;
  }
}

export function setSoundEnabled(on: boolean) {
  try {
    localStorage.setItem(KEY, on ? "on" : "off");
  } catch {}
}

export function armSound() {
  if (armed || typeof window === "undefined") return;
  armed = true;
  const unlock = () => {
    const c = context();
    if (c && c.state === "suspended") c.resume().catch(() => {});
    if (c && c.state === "running") {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
      window.removeEventListener("touchend", unlock);
    }
  };
  window.addEventListener("pointerdown", unlock, { passive: true });
  window.addEventListener("keydown", unlock);
  window.addEventListener("touchend", unlock, { passive: true });
}

export function refreshSounds() {
  manifest = null;
  manifestLoad = null;
  buffers.clear();
}

async function customKinds(): Promise<Record<string, number>> {
  if (manifest && Date.now() - manifest.at < 5 * 60_000) return manifest.kinds;
  manifestLoad ??= fetch("/api/sounds", { cache: "no-store" })
    .then((r) => (r.ok ? r.json() : { kinds: {} }))
    .then((j: { kinds?: Record<string, number> }) => {
      manifest = { at: Date.now(), kinds: j.kinds ?? {} };
      return manifest.kinds;
    })
    .catch(() => ({}))
    .finally(() => {
      manifestLoad = null;
    });
  return manifestLoad;
}

function loadBuffer(c: AudioContext, url: string): Promise<AudioBuffer | null> {
  let hit = buffers.get(url);
  if (!hit) {
    hit = fetch(url)
      .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject()))
      .then((b) => c.decodeAudioData(b))
      .catch(() => {
        buffers.delete(url);
        return null;
      });
    buffers.set(url, hit);
  }
  return hit;
}

function tone(c: AudioContext, at: number, freq: number, to: number, length: number, peak: number) {
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(freq, at);
  osc.frequency.exponentialRampToValueAtTime(to, at + length * 0.6);
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(peak, at + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + length);
  osc.connect(gain).connect(c.destination);
  osc.start(at);
  osc.stop(at + length + 0.02);
}

function builtIn(c: AudioContext, kind: string) {
  const t = c.currentTime + 0.01;
  if (kind === "chat") {
    tone(c, t, 740, 980, 0.12, 0.16);
    tone(c, t + 0.1, 1180, 1480, 0.16, 0.13);
  } else {
    tone(c, t, 660, 660, 0.22, 0.12);
    tone(c, t + 0.13, 880, 880, 0.22, 0.12);
    tone(c, t + 0.26, 1320, 1320, 0.32, 0.1);
  }
}

async function ready(): Promise<AudioContext | null> {
  const c = context();
  if (!c) return null;
  if (c.state === "suspended") await c.resume().catch(() => {});
  return c.state === "running" ? c : null;
}

export function playBuffer(c: AudioContext, buffer: AudioBuffer) {
  const src = c.createBufferSource();
  src.buffer = buffer;
  src.connect(c.destination);
  src.start();
}

export async function playSound(kind: string = "notice", force = false) {
  if (!force && !soundEnabled()) return;
  try {
    const c = await ready();
    if (!c) return;
    const version = (await customKinds())[kind];
    if (version) {
      const buffer = await loadBuffer(c, `/api/sounds/${kind}?v=${version}`);
      if (buffer) return playBuffer(c, buffer);
    }
    builtIn(c, kind);
  } catch {}
}

export async function playBlob(blob: Blob) {
  const c = await ready();
  if (!c) return;
  const buffer = await c.decodeAudioData(await blob.arrayBuffer());
  playBuffer(c, buffer);
}

export function audioContext() {
  return context();
}
