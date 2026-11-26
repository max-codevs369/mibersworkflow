"use client";

import { useState } from "react";
import { Check, Link2, Send } from "lucide-react";
import { btn } from "@/lib/ui";

export default function ShareButtons({ title }: { title: string }) {
  const [copied, setCopied] = useState(false);

  function whatsapp() {
    const text = `${title}\n${window.location.href}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
  }

  async function copy() {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = url;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex flex-wrap gap-2">
      <button type="button" onClick={whatsapp} className={btn.sm}>
        <Send size={15} /> WhatsApp
      </button>
      <button type="button" onClick={copy} className={btn.sm} aria-live="polite">
        {copied ? <Check size={15} className="text-ok" /> : <Link2 size={15} />}
        {copied ? "Tautan tersalin" : "Salin tautan"}
      </button>
    </div>
  );
}
