type Seen = { room: string | null; at: number };
const g = globalThis as unknown as { __m26Presence?: Map<string, Seen> };
const presence = (g.__m26Presence ??= new Map());

const FRESH_MS = 15_000;

export function markPresence(userId: string, room: string | null) {
  presence.set(userId, { room, at: Date.now() });
  if (presence.size > 5000) {
    const cutoff = Date.now() - FRESH_MS;
    for (const [k, v] of presence) if (v.at < cutoff) presence.delete(k);
  }
}

export function isViewingRoom(userId: string, room: string) {
  const s = presence.get(userId);
  return !!s && s.room === room && Date.now() - s.at < FRESH_MS;
}
