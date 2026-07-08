import path from "node:path";
import { NextResponse } from "next/server";
import { getRawPlatformPost, getRawUpload, updatePlatformPost } from "@/lib/db";
import { youtubeTitle } from "@/lib/captions";
import { EXPORT_DIR, safeJoin } from "@/lib/paths";
import { uploadYouTube } from "@/platforms/youtube/client";

export const runtime = "nodejs";

export async function POST(_: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const upload = getRawUpload(id);
  const post = getRawPlatformPost(id, "youtube");
  if (!upload || !post) return NextResponse.json({ error: "Prepared post not found." }, { status: 404 });
  if (!post.enabled) return NextResponse.json({ error: "YouTube is disabled for this post." }, { status: 400 });
  try {
    const caption = String(post.caption);
    const hashtags = JSON.parse(String(post.hashtags_json)) as string[];
    const result = await uploadYouTube({
      filePath: safeJoin(EXPORT_DIR, String(post.export_filename)), title: youtubeTitle(caption), description: caption,
      tags: hashtags, privacy: String(post.privacy), scheduledAt: post.scheduled_at ? String(post.scheduled_at) : null,
      thumbnailPath: post.use_thumbnail && upload.thumbnail_filename ? safeJoin(EXPORT_DIR, String(upload.thumbnail_filename)) : undefined,
    });
    updatePlatformPost(id, "youtube", { status: "POSTED", postedUrl: result.url });
    return NextResponse.json({ url: result.url });
  } catch (error) {
    const message = error instanceof Error ? error.message : "YouTube upload failed.";
    updatePlatformPost(id, "youtube", { status: "FAILED", error: message });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
