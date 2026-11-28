import { requireUser } from "@/lib/session";
import { container } from "@/components/PageHeader";
import { cx } from "@/lib/ui";
import ShareInbox from "./share-inbox";

export const dynamic = "force-dynamic";

export const metadata = { title: "Bagikan bukti", robots: { index: false, follow: false } };

export default async function SharePage() {
  await requireUser("/bagikan");
  return (
    <section className={cx(container, "max-w-xl py-8")}>
      <ShareInbox />
    </section>
  );
}
