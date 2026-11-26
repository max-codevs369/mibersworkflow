import SiteNavbar from "@/components/SiteNavbar";
import Footer from "@/components/Footer";
import { getSettings } from "@/lib/settings";

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const settings = await getSettings();
  return (
    <>
      <SiteNavbar />
      <main id="konten" className="min-h-[70dvh]">
        {children}
      </main>
      <Footer settings={settings} />
    </>
  );
}
