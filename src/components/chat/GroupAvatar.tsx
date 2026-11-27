import SafeImg from "@/components/ui/SafeImg";
import { groupInitials, groupTone } from "@/lib/chat";

export default function GroupAvatar({ id, title, size = 48, src }: { id: string; title: string; size?: number; src?: string | null }) {
  const initials = (
    <span
      aria-hidden
      className="flex flex-none select-none items-center justify-center rounded-full font-semibold"
      style={{ width: size, height: size, background: groupTone(id), color: "#0b141a", fontSize: Math.round(size * 0.36) }}
    >
      {groupInitials(title)}
    </span>
  );
  if (!src) return initials;
  return (
    <span className="block flex-none overflow-hidden rounded-full bg-wa-panel" style={{ width: size, height: size }}>
      <SafeImg src={src} alt="" width={size} className="h-full w-full object-cover" fallback={initials} />
    </span>
  );
}
