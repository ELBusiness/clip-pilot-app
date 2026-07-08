import { spawn } from "node:child_process";
import { stat } from "node:fs/promises";

export type VideoMetadata = { duration: number; width: number; height: number; format: string; videoCodec: string; hasAudio: boolean };

function run(binary: string, args: string[]) {
  return new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
    const child = spawn(binary, args, { windowsHide: true });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => stdout += chunk);
    child.stderr.on("data", (chunk) => stderr += chunk);
    child.on("error", (error) => reject(new Error(`${binary} could not start. Install FFmpeg or set its path. ${error.message}`)));
    child.on("close", (code) => code === 0 ? resolve({ stdout, stderr }) : reject(new Error(`${binary} failed: ${stderr.slice(-800)}`)));
  });
}

export async function probeVideo(inputPath: string): Promise<VideoMetadata> {
  const { stdout } = await run(process.env.FFPROBE_PATH || "ffprobe", ["-v", "error", "-show_streams", "-show_format", "-of", "json", inputPath]);
  const data = JSON.parse(stdout) as { streams: Array<{ codec_type: string; codec_name?: string; width?: number; height?: number; duration?: string }>; format: { duration?: string; format_name?: string } };
  const video = data.streams.find((stream) => stream.codec_type === "video");
  if (!video?.width || !video?.height) throw new Error("No readable video stream was found.");
  return {
    duration: Number(data.format.duration || video.duration || 0), width: video.width, height: video.height,
    format: data.format.format_name || "unknown", videoCodec: video.codec_name || "unknown",
    hasAudio: data.streams.some((stream) => stream.codec_type === "audio"),
  };
}

export async function validateVideo(inputPath: string, originalName: string, size: number) {
  const extension = originalName.toLowerCase().split(".").pop();
  if (!extension || !["mp4", "mov"].includes(extension)) throw new Error("Only .mp4 and .mov files are accepted.");
  const maxBytes = Number(process.env.MAX_UPLOAD_BYTES || 524_288_000);
  if (size <= 0 || size > maxBytes) throw new Error(`Video must be between 1 byte and ${Math.round(maxBytes / 1024 / 1024)} MB.`);
  const metadata = await probeVideo(inputPath);
  const maxSeconds = Number(process.env.MAX_VIDEO_SECONDS || 180);
  if (!metadata.duration || metadata.duration > maxSeconds) throw new Error(`Video must be ${maxSeconds} seconds or shorter.`);
  return metadata;
}

export async function exportVertical(inputPath: string, outputPath: string) {
  const binary = process.env.FFMPEG_PATH || "ffmpeg";
  const args = ["-y", "-i", inputPath, "-map", "0:v:0", "-map", "0:a:0?", "-vf",
    "scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1",
    "-c:v", "libx264", "-preset", "medium", "-crf", "20", "-pix_fmt", "yuv420p", "-r", "30",
    "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-movflags", "+faststart", outputPath];
  await run(binary, args);
  const info = await stat(outputPath);
  if (!info.size) throw new Error("FFmpeg produced an empty export.");
}

export async function extractThumbnail(inputPath: string, outputPath: string, duration: number) {
  const at = Math.max(0, Math.min(duration / 2, 5)).toFixed(2);
  await run(process.env.FFMPEG_PATH || "ffmpeg", ["-y", "-ss", at, "-i", inputPath, "-frames:v", "1", "-vf", "scale=720:-2", "-q:v", "2", outputPath]);
}

export function isNineBySixteen(width: number, height: number) {
  return height > width && Math.abs(width / height - 9 / 16) < 0.02;
}
