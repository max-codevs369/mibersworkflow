import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { cookies } from "next/headers";
import { ThemeProvider, type ThemeMode } from "@/components/ThemeProvider";
import ScrollKeeper from "@/components/ScrollKeeper";
import PushManager from "@/components/PushManager";
import InAppNotice from "@/components/InAppNotice";
import { getSettings } from "@/lib/settings";
import { getSession } from "@/lib/session";
import { pushPublicKey } from "@/lib/push";
import { siteUrl } from "@/lib/seo";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSettings();
  return {
    metadataBase: new URL(siteUrl()),
    title: { default: `${s.site_name} · ${s.site_tagline}`, template: `%s · ${s.site_name}` },
    description: s.site_description,
    applicationName: s.site_name,
    keywords: [
      s.site_name,
      s.site_short,
      "Mibers",
      "MIB",
      s.study_program,
      s.department,
      s.school_name,
      "kelas",
      "angkatan " + s.class_year,
    ].filter(Boolean),
    authors: [{ name: s.site_name }],
    creator: s.site_name,
    publisher: s.site_name,
    category: "education",
    formatDetection: { telephone: false, email: false, address: false },
    robots: {
      index: true,
      follow: true,
      googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 },
    },
    openGraph: {
      title: s.site_name,
      description: s.site_description,
      siteName: s.site_name,
      locale: "id_ID",
      type: "website",
      url: "/",
    },
    twitter: {
      card: "summary_large_image",
      title: s.site_name,
      description: s.site_description,
    },
    ...(process.env.GOOGLE_SITE_VERIFICATION
      ? { verification: { google: process.env.GOOGLE_SITE_VERIFICATION } }
      : {}),
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f3ee" },
    { media: "(prefers-color-scheme: dark)", color: "#141311" },
  ],
  colorScheme: "dark light",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [store, session] = await Promise.all([cookies(), getSession()]);
  const saved = store.get("m26-theme")?.value;
  const theme: ThemeMode = saved === "light" || saved === "dark" ? saved : "system";
  return (
    <html
      lang="id"
      data-scroll-behavior="smooth"
      className={inter.variable}
      data-theme={theme === "system" ? undefined : theme}
      suppressHydrationWarning
    >
      <body className="font-sans antialiased">
        <ScrollKeeper />
        <ThemeProvider initial={theme}>{children}</ThemeProvider>
        {session && <PushManager publicKey={pushPublicKey()} />}
        {session && <InAppNotice />}
      </body>
    </html>
  );
}
