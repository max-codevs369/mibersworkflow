function igHandleOf(v?: string | null) {
  const t = (v ?? "").trim();
  if (!t) return null;
  let raw = t;
  if (/^[a-z][a-z0-9+.-]*:/i.test(t) || /^(www\.)?instagram\.com\//i.test(t)) {
    try {
      const u = new URL(/^[a-z][a-z0-9+.-]*:/i.test(t) ? t : `https://${t}`);
      if (!/^https?:$/.test(u.protocol) || !/^(www\.|m\.)?instagram\.com$/i.test(u.hostname)) return null;
      raw = u.pathname.split("/").filter(Boolean)[0] ?? "";
    } catch {
      return null;
    }
  }
  const handle = raw.replace(/^@/, "").replace(/[^a-zA-Z0-9._]/g, "").slice(0, 30);
  return handle || null;
}

export function instagramUrl(v?: string | null) {
  const h = igHandleOf(v);
  return h ? `https://www.instagram.com/${h}` : null;
}

export function instagramHandle(v?: string | null) {
  const h = igHandleOf(v);
  return h ? `@${h}` : null;
}

export function whatsappUrl(phone?: string | null) {
  if (!phone) return null;
  let d = phone.replace(/\D/g, "");
  if (!d) return null;
  if (d.startsWith("0")) d = `62${d.slice(1)}`;
  else if (d.startsWith("8")) d = `62${d}`;
  return d.length >= 9 && d.length <= 15 ? `https://wa.me/${d}` : null;
}

export function shortName(fullName: string) {
  const words = fullName.trim().split(/\s+/).filter(Boolean);
  return words.find((w) => w.length > 1 && !w.endsWith(".")) ?? words[0] ?? "";
}
