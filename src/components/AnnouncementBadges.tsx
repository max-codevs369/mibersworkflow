import { CATEGORY_LABEL } from "@/lib/announcements";
import { badge } from "@/lib/ui";

export default function AnnouncementBadges({
  category,
  priority,
  isPinned,
  isNew,
}: {
  category: string;
  priority: string;
  isPinned?: boolean;
  isNew?: boolean;
}) {
  return (
    <>
      {priority === "URGENT" && <span className={`${badge} bg-danger text-ink`}>MENDESAK</span>}
      {priority === "IMPORTANT" && <span className={`${badge} border border-brand/60 text-brand`}>PENTING</span>}
      {isPinned && <span className={`${badge} bg-brand/15 text-brand`}>DISEMATKAN</span>}
      {isNew && <span className={`${badge} bg-ok/15 text-ok`}>BARU</span>}
      <span className={`${badge} bg-surface-3 text-muted`}>{CATEGORY_LABEL[category]?.toUpperCase()}</span>
    </>
  );
}
