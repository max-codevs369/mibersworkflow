type Entry = { at: number; value: Promise<unknown> };

const store = (globalThis as unknown as { __memo?: Map<string, Entry> }).__memo ?? new Map<string, Entry>();
(globalThis as unknown as { __memo?: Map<string, Entry> }).__memo = store;

export function memo<T>(key: string, ttlMs: number, load: () => Promise<T>): Promise<T> {
  const hit = store.get(key);
  if (hit && Date.now() - hit.at < ttlMs) return hit.value as Promise<T>;
  const value = load();
  store.set(key, { at: Date.now(), value });
  value.catch(() => {
    if (store.get(key)?.value === value) store.delete(key);
  });
  return value;
}
