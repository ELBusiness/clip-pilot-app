import { NextResponse } from "next/server";
import { getRawPlatformPost, getRawUpload, updatePlatformPost } from "@/lib/db";
import { EXPORT_DIR, safeJoin } from "@/lib/paths";
import { directPostTikTok, fetchTikTokPublishStatus } from "@/platforms/tiktok/client";

export const runtime = "nodejs";
const delay = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds));

export async function POST(_: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const upload = getRawUpload(id);
  const post = getRawPlatformPost(id, "tiktok");
  if (!upload || !post) return NextResponse.json({ error: "Prepared post not found." }, { status: 404 });
  if (!post.enabled) return NextResponse.json({ error: "TikTok is disabled for this post." }, { status: 400 });
  if (post.scheduled_at && new Date(String(post.scheduled_at)).getTime() > Date.now()) {
    return NextResponse.json({ error: "TikTok's Direct Post API does not provide native scheduling. Clear the schedule to post now, or use the manual checklist at the selected time." }, { status: 400 });
  }
  try {
    const started = await directPostTikTok({
      filePath: safeJoin(EXPORT_DIR, String(post.export_filename)), caption: String(post.caption),
      privacy: String(post.privacy), durationSeconds: Number(upload.duration_seconds),
    });
    updatePlatformPost(id, "tiktok", { status: "PROCESSING" });
    for (let attempt = 0; attempt < 15; attempt += 1) {
      await delay(2_000);
      const status = await fetchTikTokPublishStatus(started.publishId);
      if (status.data.status === "PUBLISH_COMPLETE") {
        updatePlatformPost(id, "tiktok", { status: "POSTED" });
        return NextResponse.json({ publishId: started.publishId, status: "POSTED" });
      }
      if (status.data.status === "FAILED") throw new Error(status.data.fail_reason || "TikTok rejected the post.");
    }
    return NextResponse.json({ publishId: started.publishId, status: "PROCESSING", message: "TikTok accepted the upload and is still processing it." }, { status: 202 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "TikTok upload failed.";
    updatePlatformPost(id, "tiktok", { status: "FAILED", error: message });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
