import { randomUUID } from "node:crypto";
import { copyFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { z } from "zod";
import { createUpload, listUploads, setPlatformReadyIfConnected } from "@/lib/db";
import { normalizeHashtags, platformCaption } from "@/lib/captions";
import { EXPORT_DIR, UPLOAD_DIR } from "@/lib/paths";
import { exportVertical, extractThumbnail, isNineBySixteen, validateVideo } from "@/lib/video";
import { PLATFORMS, type Platform, type PlatformInput } from "@/lib/types";
import { tokenStatus } from "@/lib/token-vault";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const platformSchema = z.object({
  enabled: z.boolean(), caption: z.string().max(5000).optional(), hashtags: z.array(z.string()).max(30).optional(),
  privacy: z.string().max(30), scheduledAt: z.string().nullable().optional(), useThumbnail: z.boolean().default(true),
});
const settingsSchema = z.object({
  youtube: platformSchema,
  tiktok: platformSchema,
  instagram: platformSchema,
});

export async function GET() {
  return NextResponse.json({ uploads: listUploads() });
}

export async function POST(request: Request) {
  let inputPath = "";
  try {
    const form = await request.formData();
    const file = form.get("video");
    if (!(file instanceof File)) return NextResponse.json({ error: "Choose an MP4 or MOV video." }, { status: 400 });
    const caption = String(form.get("caption") || "").trim();
    if (!caption) return NextResponse.json({ error: "A caption is required." }, { status: 400 });
    const hashtags = normalizeHashtags(String(form.get("hashtags") || ""));
    const parsedSettings = settingsSchema.parse(JSON.parse(String(form.get("settings") || "{}")));
    const id = randomUUID();
    const extension = path.extname(file.name).toLowerCase();
    const storedFilename = `${id}-original${extension}`;
    inputPath = path.join(UPLOAD_DIR, storedFilename);
    await writeFile(inputPath, Buffer.from(await file.arrayBuffer()));
    const metadata = await validateVideo(inputPath, file.name, file.size);

    const masterExport = path.join(EXPORT_DIR, `${id}-master.mp4`);
    await exportVertical(inputPath, masterExport);
    for (const platform of PLATFORMS) await copyFile(masterExport, path.join(EXPORT_DIR, `${id}-${platform}.mp4`));
    await unlink(masterExport);
    const thumbnailFilename = `${id}-thumbnail.jpg`;
    await extractThumbnail(path.join(EXPORT_DIR, `${id}-youtube.mp4`), path.join(EXPORT_DIR, thumbnailFilename), metadata.duration);

    const platforms = Object.fromEntries(PLATFORMS.map((platform) => {
      const value = parsedSettings[platform];
      const specificTags = normalizeHashtags(value.hashtags?.length ? value.hashtags : hashtags);
      return [platform, {
        enabled: value.enabled,
        caption: value.caption?.trim() || platformCaption(platform, caption, specificTags),
        hashtags: specificTags,
        privacy: value.privacy,
        scheduledAt: value.scheduledAt || null,
        useThumbnail: value.useThumbnail,
      } satisfies PlatformInput];
    })) as Record<Platform, PlatformInput>;

    createUpload({ id, originalFilename: file.name, storedFilename, caption, hashtags, createdAt: new Date().toISOString(),
      durationSeconds: metadata.duration, width: metadata.width, height: metadata.height, fileSizeBytes: file.size,
      isVertical: isNineBySixteen(metadata.width, metadata.height), thumbnailFilename, platforms });
    for (const platform of PLATFORMS) {
      try { setPlatformReadyIfConnected(platform, tokenStatus(platform).connected); } catch { /* Platform remains disconnected. */ }
    }
    return NextResponse.json({ upload: listUploads().find((item) => item.id === id) }, { status: 201 });
  } catch (error) {
    if (inputPath) await unlink(inputPath).catch(() => undefined);
    const message = error instanceof Error ? error.message : "The video could not be prepared.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
