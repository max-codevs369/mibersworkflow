"use client";

import {
  ALL_FORMATS,
  BlobSource,
  BufferTarget,
  Conversion,
  Input,
  Mp4OutputFormat,
  Output,
  Quality,
  WebMOutputFormat,
  canEncodeAudio,
  canEncodeVideo,
} from "mediabunny";
import { MB, MEDIA_LIMITS, MAX_VIDEO_SECONDS } from "@/lib/media-limits";

export class VideoCompressError extends Error {}

export type VideoJob = { cancel: () => void; result: Promise<File> };

const L = MEDIA_LIMITS;
const PLAYABLE = ["video/mp4", "video/webm"];

export function compressVideo(file: File, onProgress?: (p: number) => void): VideoJob {
  let conversion: Conversion | null = null;
  let canceled = false;

  const result = (async () => {
    if (PLAYABLE.includes(file.type) && file.size <= 4 * MB) return file;

    if (typeof VideoEncoder === "undefined" || typeof VideoDecoder === "undefined") {
      return passThroughOrFail(file, "Browser ini tidak bisa mengompres video. Coba pakai Chrome terbaru.");
    }

    const input = new Input({ source: new BlobSource(file), formats: ALL_FORMATS });
    try {
      const video = await input.getPrimaryVideoTrack();
      if (!video) throw new VideoCompressError("File ini tidak berisi video.");
      const audio = await input.getPrimaryAudioTrack();
      const duration = await input.computeDuration();
      if (!duration || !Number.isFinite(duration)) throw new VideoCompressError("Durasi video tidak terbaca.");

      const audioBits = audio ? L.audioBitrate : 0;
      const budget = (L.videoTargetMB * MB * 8) / duration - audioBits;
      const bitrate = Math.min(L.videoMaxBitrate, Math.floor(budget * 0.92));
      if (bitrate < L.videoMinBitrate) {
        const max = MAX_VIDEO_SECONDS >= 120 ? `${Math.floor(MAX_VIDEO_SECONDS / 60)} menit` : `${MAX_VIDEO_SECONDS} detik`;
        throw new VideoCompressError(`Video terlalu panjang (${Math.round(duration)} detik). Maksimal sekitar ${max}; potong dulu videonya.`);
      }

      const w = video.displayWidth;
      const h = video.displayHeight;
      const short = Math.min(w, h);
      const scale = short > L.videoShortSide ? L.videoShortSide / short : 1;
      const even = (n: number) => Math.max(2, Math.round(n / 2) * 2);
      const size = { width: even(w * scale), height: even(h * scale) };

      let frameRate: number | undefined;
      try {
        const stats = await video.computePacketStats(120);
        if (stats.averagePacketRate > 31) frameRate = 30;
      } catch {}

      const quality = new Quality({ bitrate });
      const mp4 = (await canEncodeVideo("avc", { ...size, quality })) && (!audio || (await canEncodeAudio("aac", { quality: new Quality({ bitrate: audioBits }) })));
      const webm = !mp4 && (await canEncodeVideo("vp9", { ...size, quality })) && (!audio || (await canEncodeAudio("opus")));
      if (!mp4 && !webm) return passThroughOrFail(file, "Browser ini tidak bisa mengompres video. Coba pakai Chrome terbaru.");

      const target = new BufferTarget();
      const output = new Output({
        format: mp4 ? new Mp4OutputFormat({ fastStart: "in-memory" }) : new WebMOutputFormat(),
        target,
      });
      conversion = await Conversion.init({
        input,
        output,
        tracks: "primary",
        video: { ...size, fit: "fill", frameRate, codec: mp4 ? "avc" : "vp9", quality, forceTranscode: true },
        audio: audio ? { codec: mp4 ? "aac" : "opus", quality: new Quality({ bitrate: audioBits }), numberOfChannels: 2 } : { discard: true },
      });
      if (canceled) throw new VideoCompressError("Dibatalkan.");
      if (!conversion.isValid) return passThroughOrFail(file, "Format video ini tidak didukung. Gunakan MP4 atau MOV dari kamera HP.");
      conversion.onProgress = (p) => onProgress?.(Math.min(1, p));
      await conversion.execute();

      const buf = target.buffer;
      if (!buf) throw new VideoCompressError("Gagal mengompres video.");
      const base = file.name.replace(/\.[^.]+$/, "") || "video";
      const out = new File([buf], `${base}.${mp4 ? "mp4" : "webm"}`, { type: mp4 ? "video/mp4" : "video/webm" });

      if (PLAYABLE.includes(file.type) && file.size <= out.size) return file;
      return out;
    } catch (e) {
      if (e instanceof VideoCompressError) throw e;
      if (canceled) throw new VideoCompressError("Dibatalkan.");
      return passThroughOrFail(file, "Video tidak bisa dikompres di perangkat ini. Coba video lain atau pakai Chrome.");
    } finally {
      input.dispose();
    }
  })();

  return {
    result,
    cancel: () => {
      canceled = true;
      conversion?.cancel().catch(() => {});
    },
  };
}

function passThroughOrFail(file: File, reason: string): File {
  if (PLAYABLE.includes(file.type) && file.size <= L.videoMB * MB) return file;
  throw new VideoCompressError(reason);
}
