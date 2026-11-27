import { Camera } from "lucide-react";
import { readableTone } from "@/lib/ui";
import SafeImg from "@/components/ui/SafeImg";
import { Clip } from "@/components/notes/NoteCard";

type Photo = { url: string; caption: string };

export default function HeroVisual({
  photos,
  quote,
  quoteBy,
  tone = "#f5822a",
}: {
  photos: Photo[];
  quote: string;
  quoteBy: string;
  tone?: string;
}) {
  const [main, second, third] = photos;

  return (
    <div className="grid w-full grid-cols-5 gap-3">
      <Frame photo={main} className="col-span-3 row-span-2 aspect-[4/5]" eager />
      <Frame photo={second} className="col-span-2" />
      <Frame photo={third} className="col-span-2" />

      <figure
        className="relative col-span-5 mt-3 rounded-xl border border-line bg-surface-2 px-5 pb-4 pt-6"
        style={{ boxShadow: `inset 3px 0 0 ${tone}` }}
      >
        <Clip tone={tone} />
        <p className="eyebrow" style={{ color: readableTone(tone) }}>
          Kata hari ini
        </p>
        <blockquote className="prose-safe mt-2 line-clamp-3 text-[15px] leading-relaxed text-fg sm:text-base">
          {quote}
        </blockquote>
        <figcaption className="mt-2 text-[13px] text-muted">— {quoteBy}</figcaption>
      </figure>
    </div>
  );
}

function Frame({ photo, className, eager }: { photo?: Photo; className: string; eager?: boolean }) {
  const empty = (
    <span className="flex h-full w-full flex-col items-center justify-center gap-2 bg-surface-2 p-3 text-center text-faint">
      <Camera size={22} aria-hidden />
      <span className="text-xs">Foto pilihan belum dipilih</span>
    </span>
  );
  return (
    <div className={`relative overflow-hidden rounded-xl border border-line bg-surface-2 ${className}`}>
      {photo ? (
        <>
          <SafeImg src={photo.url} alt={photo.caption} width={640} eager={eager} className="h-full w-full object-cover" fallback={empty} />
          {photo.caption && (
            <span className="absolute bottom-2 left-2 right-2 truncate rounded-md bg-ink/80 px-2 py-1 font-mono text-[11px] text-fg/90">
              {photo.caption}
            </span>
          )}
        </>
      ) : (
        empty
      )}
    </div>
  );
}
