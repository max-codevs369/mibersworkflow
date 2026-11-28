self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

const APP_ICON = "/icon.png";
const BADGE = "/badge.png";

function parse(event) {
  try {
    return event.data ? event.data.json() : {};
  } catch {
    return { body: event.data ? event.data.text() : "" };
  }
}

const localPath = (v, prefix) => (typeof v === "string" && v.startsWith(prefix) ? v : null);

self.addEventListener("push", (event) => {
  const data = parse(event);
  const title = data.title || "Mibers Duo Anam";
  const url = localPath(data.url, "/") || "/";
  const icon = localPath(data.icon, "/files/images/") || APP_ICON;
  const chat = data.chat && typeof data.chat.id === "string" ? data.chat : null;
  const tag = data.tag || undefined;

  event.waitUntil(
    (async () => {
      const wins = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      const active = wins.find((w) => w.focused && w.visibilityState === "visible");
      if (active) {
        active.postMessage({ type: "m26-notice", kind: chat ? "message" : "notice", title, body: data.body || "", url, icon });
        return;
      }

      let lines = [];
      let count = 0;
      if (chat && tag) {
        const prev = await self.registration.getNotifications({ tag });
        for (const n of prev) {
          lines = Array.isArray(n.data?.lines) ? n.data.lines : [];
          count = Number(n.data?.count) || lines.length;
        }
        lines = [...lines, chat.line].slice(-6);
        count += 1;
      }

      const options = {
        body: chat ? lines.join("\n") : data.body || "",
        icon,
        badge: BADGE,
        tag,
        renotify: Boolean(tag),
        silent: false,
        requireInteraction: false,
        timestamp: Number(data.ts) || Date.now(),
        vibrate: [180, 80, 180],
        data: { url, chatId: chat ? chat.id : null, lines, count },
      };
      if (chat) {
        options.actions = [
          { action: "reply", title: "Balas" },
          { action: "read", title: "Tandai dibaca" },
        ];
      }
      const heading = chat && count > 1 ? `${title} (${count} pesan)` : title;
      await self.registration.showNotification(heading, options);
    })()
  );
});

async function openUrl(path) {
  const target = new URL(path || "/", self.location.origin).href;
  const wins = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
  const exact = wins.find((w) => w.url === target);
  if (exact) return exact.focus();
  const ours = wins.find((w) => new URL(w.url).origin === self.location.origin);
  if (ours) {
    await ours.focus();
    return ours.navigate(target).catch(() => self.clients.openWindow(target));
  }
  return self.clients.openWindow(target);
}

self.addEventListener("notificationclick", (event) => {
  const n = event.notification;
  n.close();
  const chatId = n.data?.chatId;
  if (event.action === "read" && chatId) {
    event.waitUntil(
      fetch("/api/obrolan/read", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: chatId }),
      }).catch(() => {})
    );
    return;
  }
  event.waitUntil(openUrl(n.data?.url));
});

self.addEventListener("message", (event) => {
  const msg = event.data;
  if (!msg || msg.type !== "m26-clear" || typeof msg.tag !== "string") return;
  event.waitUntil(
    self.registration.getNotifications({ tag: msg.tag }).then((list) => list.forEach((n) => n.close()))
  );
});
