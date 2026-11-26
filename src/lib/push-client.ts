"use client";

import { removePushSubscription, savePushSubscription } from "@/app/push-actions";

export type PushState = "unsupported" | "ios-install" | "denied" | "default" | "granted";

const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
const isStandalone = () =>
  window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;

const noop = () => () => {};

export const clientOnly = { subscribe: noop };

export function pushState(): PushState {
  if (typeof window === "undefined") return "unsupported";
  const supported = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;

  if (isIOS() && !isStandalone()) return "ios-install";
  if (!supported) return "unsupported";
  return Notification.permission as PushState;
}

function keyBytes(base64: string) {
  const pad = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

async function registration() {
  return navigator.serviceWorker.register("/sw.js", { scope: "/" }).then(() => navigator.serviceWorker.ready);
}

async function subscribeAndSave(publicKey: string) {
  const reg = await registration();
  let sub = await reg.pushManager.getSubscription();
  const wanted = keyBytes(publicKey);

  const current = sub?.options.applicationServerKey ? new Uint8Array(sub.options.applicationServerKey) : null;
  if (sub && current && (current.length !== wanted.length || current.some((b, i) => b !== wanted[i]))) {
    await sub.unsubscribe();
    sub = null;
  }
  sub ??= await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: wanted });
  const res = await savePushSubscription(sub.toJSON() as never, navigator.userAgent);
  if (res.error) throw new Error(res.error);
}

export async function enablePush(publicKey: string): Promise<PushState> {
  const st = pushState();
  if (st === "unsupported" || st === "ios-install") return st;
  const perm = await Notification.requestPermission();
  if (perm !== "granted") return perm as PushState;
  await subscribeAndSave(publicKey);
  return "granted";
}

export async function syncPush(publicKey: string) {
  if (pushState() !== "granted") return;
  const flag = "m26-push-synced";
  if (sessionStorage.getItem(flag) === publicKey) return;
  await subscribeAndSave(publicKey);
  sessionStorage.setItem(flag, publicKey);
}

export async function disablePushHere() {
  try {
    if (!("serviceWorker" in navigator)) return;
    const reg = await navigator.serviceWorker.getRegistration("/");
    const sub = await reg?.pushManager.getSubscription();
    if (!sub) return;
    await removePushSubscription(sub.endpoint).catch(() => {});
    await sub.unsubscribe().catch(() => {});
    sessionStorage.removeItem("m26-push-synced");
  } catch {}
}
