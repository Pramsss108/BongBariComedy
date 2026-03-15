/**
 * ffmpeg-trim-engine.ts — Phrase 11 & 12 of masterplan
 *
 * Lazy-loads @ffmpeg/ffmpeg (WebAssembly) only when user clicks "Trim & Download".
 * Runs trimming 100% in-browser — zero server cost.
 *
 * Cost: $0 — ffmpeg.wasm binary is cached by browser after first load.
 */

import { FFmpeg } from "@ffmpeg/ffmpeg";
import { toBlobURL, fetchFile } from "@ffmpeg/util";

let ffmpegInstance: FFmpeg | null = null;
let isLoaded = false;

// PHRASE 12: Device check — ffmpeg.wasm needs at least 2GB RAM
export function canRunFfmpeg(): boolean {
  // @ts-ignore — deviceMemory is experimental
  const mem = (navigator as any).deviceMemory ?? 4; // default assume capable
  const cores = navigator.hardwareConcurrency ?? 2;
  return mem >= 2 && cores >= 2;
}

/**
 * Loads ffmpeg.wasm lazily.
 * Provides a progress callback so the UI can show "Loading Trim Engine... 45%"
 */
export async function loadFfmpeg(
  onProgress?: (ratio: number) => void
): Promise<FFmpeg> {
  if (isLoaded && ffmpegInstance) return ffmpegInstance;

  const ffmpeg = new FFmpeg();
  ffmpegInstance = ffmpeg;

  // Use unpkg CDN for the WASM core (cached by browser after first load)
  const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd";

  // @ts-ignore — ffmpeg progress event has `ratio` field from @ffmpeg/ffmpeg package
  ffmpeg.on("progress", (e: any) => {
    onProgress?.(e.ratio ?? 0);
  });

  await ffmpeg.load({
    coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
    wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, "application/wasm"),
  });

  isLoaded = true;
  return ffmpeg;
}

export interface TrimOptions {
  videoBlob: Blob;
  startSec: number;   // start time in seconds
  endSec: number;     // end time in seconds
  outputExt?: "mp4" | "mp3";
  onProgress?: (ratio: number) => void;
}

/**
 * PHRASE 11: Trim the video/audio blob in-browser using ffmpeg.wasm.
 * Returns a new Blob containing only the trimmed segment.
 */
export async function trimMedia(opts: TrimOptions): Promise<Blob> {
  const { videoBlob, startSec, endSec, outputExt = "mp4", onProgress } = opts;

  if (endSec <= startSec) {
    throw new Error("End time must be after start time.");
  }

  const ffmpeg = await loadFfmpeg(onProgress);

  // Write input file into ffmpeg's virtual filesystem
  const inputName = "input." + (videoBlob.type.includes("audio") ? "mp3" : "mp4");
  const outputName = `trimmed.${outputExt}`;

  // @ts-ignore — ffmpeg progress event has `ratio` field
  ffmpeg.on("progress", (e: any) => onProgress?.(e.ratio ?? 0));

  await ffmpeg.writeFile(inputName, await fetchFile(videoBlob));

  // -c copy = no re-encode, ultra-fast, stream-copy only
  await ffmpeg.exec([
    "-ss", String(startSec),
    "-to", String(endSec),
    "-i", inputName,
    "-c", "copy",
    "-avoid_negative_ts", "1",
    outputName,
  ]);

  const data = await ffmpeg.readFile(outputName);

  // Clean up virtual filesystem
  await ffmpeg.deleteFile(inputName);
  await ffmpeg.deleteFile(outputName);

  const mimeType = outputExt === "mp3" ? "audio/mpeg" : "video/mp4";
  // data is Uint8Array — convert via ArrayBuffer to satisfy strict Blob typing
  return new Blob([data as unknown as ArrayBuffer], { type: mimeType });
}

/**
 * Formats seconds as MM:SS
 */
export function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}
