import { redirect } from "next/navigation";

export default function NewAnnouncementRedirect() {
  redirect("/admin/pengumuman?baru=1");
}
