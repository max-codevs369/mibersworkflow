import type { MetadataRoute } from "next";
import { getSettings } from "@/lib/settings";

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const s = await getSettings();
  return {
    name: s.site_name,
    short_name: s.site_short || s.site_name,
    description: s.site_description,
    lang: "id",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#f6f3ee",
    theme_color: "#ff7a1a",
    icons: [
      { src: "/icon.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
