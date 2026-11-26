import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";
export const alt = "Mibers Duo Anam";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpengraphImage() {
  const [s, logo] = await Promise.all([getSettings(), readFile(join(process.cwd(), "public", "icon-512.png"))]);
  const logoSrc = `data:image/png;base64,${logo.toString("base64")}`;
  const sub = [s.study_program, s.school_name].filter(Boolean).join(" · ");

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 80px",
          background: "linear-gradient(135deg, #141311 0%, #222019 60%, #2b2924 100%)",
          color: "#e4dfd5",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
          <img src={logoSrc} width={112} height={112} alt="" style={{ borderRadius: 28 }} />
          <div style={{ display: "flex", fontSize: 30, color: "#a29c91", letterSpacing: 2 }}>
            {s.site_short.toUpperCase()}
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ display: "flex", fontSize: 88, fontWeight: 800, lineHeight: 1.05, color: "#ffffff" }}>
            {s.site_name}
          </div>
          <div style={{ display: "flex", fontSize: 38, color: "#f5822a", fontWeight: 600 }}>{s.site_tagline}</div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 26, color: "#a29c91" }}>
          <div style={{ display: "flex" }}>{sub}</div>
          <div style={{ display: "flex", width: 160, height: 10, borderRadius: 5, background: "#f5822a" }} />
        </div>
      </div>
    ),
    size,
  );
}
