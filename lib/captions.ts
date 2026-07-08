import type { Platform } from "./types";

const LIMITS: Record<Platform, number> = {
  youtube: 5000,
  tiktok: 2200,
  instagram: 2200,
};

export function normalizeHashtags(value: string | string[]): string[] {
  const parts = Array.isArray(value) ? value : value.split(/[\s,]+/);
  return [...new Set(parts.map((item) => item.trim()).filter(Boolean).map((item) => {
    const clean = item.replace(/^#+/, "").replace(/[^\p{L}\p{N}_]/gu, "");
    return clean ? `#${clean}` : "";
  }).filter(Boolean))].slice(0, 30);
}

export function platformCaption(platform: Platform, caption: string, hashtags: string[]) {
  const tags = normalizeHashtags(hashtags).join(" ");
  const clean = caption.trim();
  const combined = tags ? `${clean}\n\n${tags}` : clean;
  const limit = LIMITS[platform];
  if (combined.length <= limit) return combined;
  const room = Math.max(0, limit - tags.length - 3);
  return `${clean.slice(0, room).trimEnd()}…${tags ? `\n\n${tags}` : ""}`.slice(0, limit);
}

export function youtubeTitle(caption: string) {
  const firstLine = caption.trim().split(/\r?\n/)[0] || "Short video";
  return firstLine.slice(0, 100);
}
