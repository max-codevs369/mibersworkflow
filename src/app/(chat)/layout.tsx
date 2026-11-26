import SiteNavbar from "@/components/SiteNavbar";

export default function ChatLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SiteNavbar />
      <main id="konten">{children}</main>
    </>
  );
}
