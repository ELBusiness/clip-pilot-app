import { NextResponse } from "next/server";
import { getRawPlatformPost, getRawUpload, updatePlatformPost } from "@/lib/db";
import { EXPORT_DIR, safeJoin } from "@/lib/paths";
import { publishInstagramReel } from "@/platforms/instagram/client";

export const runtime = "nodejs";

export async function POST(_: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const upload = getRawUpload(id);
  const post = getRawPlatformPost(id, "instagram");
  if (!upload || !post) return NextResponse.json({ error: "Prepared post not found." }, { status: 404 });
  if (!post.enabled) return NextResponse.json({ error: "Instagram is disabled for this post." }, { status: 400 });
  if (post.scheduled_at && new Date(String(post.scheduled_at)).getTime() > Date.now()) {
    return NextResponse.json({ error: "Instagram's publishing API does not provide native scheduling. Clear the schedule to post now, or use the manual checklist at the selected time." }, { status: 400 });
  }
  try {
    updatePlatformPost(id, "instagram", { status: "PROCESSING" });
    const result = await publishInstagramReel({ filePath: safeJoin(EXPORT_DIR, String(post.export_filename)), caption: String(post.caption) });
    updatePlatformPost(id, "instagram", { status: "POSTED", postedUrl: result.url });
    return NextResponse.json({ url: result.url });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Instagram upload failed.";
    updatePlatformPost(id, "instagram", { status: "FAILED", error: message });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
