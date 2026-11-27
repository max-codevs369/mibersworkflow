export const THUMB_WIDTHS = [96, 192, 384, 640, 960, 1280] as const;

export function thumbUrl(src: string, px: number) {
  if (!src.startsWith("/files/images/") || src.includes("?") || src.endsWith(".gif")) return src;
  const w = THUMB_WIDTHS.find((x) => x >= px);
  return w ? `${src}?w=${w}` : src;
}
