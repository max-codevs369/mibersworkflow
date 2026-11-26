export const MB = 1024 * 1024;

export const MEDIA_LIMITS = {
  imageMB: 5,

  videoMB: 20,

  imageTargetKB: 900,

  videoTargetMB: 18,

  requestMB: 28,

  imageMaxSide: 1920,

  videoShortSide: 720,

  videoMaxBitrate: 2_500_000,
  videoMinBitrate: 700_000,
  audioBitrate: 96_000,
} as const;

export const MAX_VIDEO_SECONDS = Math.floor(
  (MEDIA_LIMITS.videoTargetMB * MB * 8) / (MEDIA_LIMITS.videoMinBitrate + MEDIA_LIMITS.audioBitrate)
);

export const formatMB = (bytes: number) =>
  bytes >= MB ? `${(bytes / MB).toFixed(1).replace(".", ",")} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
