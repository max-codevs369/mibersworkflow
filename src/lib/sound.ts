"use client";

export type SoundKind = "message" | "notice";

const KEY = "m26-sound";
let ctx: AudioContext | null = null;
let armed = false;

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

export async function playSound(kind: SoundKind = "notice", force = false) {
  if (!force && !soundEnabled()) return;
  const c = context();
  if (!c) return;
  try {
    if (c.state === "suspended") await c.resume();
    if (c.state !== "running") return;
    const t = c.currentTime + 0.01;
    if (kind === "message") {
      tone(c, t, 740, 980, 0.12, 0.16);
      tone(c, t + 0.1, 1180, 1480, 0.16, 0.13);
    } else {
      tone(c, t, 660, 660, 0.22, 0.12);
      tone(c, t + 0.13, 880, 880, 0.22, 0.12);
      tone(c, t + 0.26, 1320, 1320, 0.32, 0.1);
    }
  } catch {}
}
