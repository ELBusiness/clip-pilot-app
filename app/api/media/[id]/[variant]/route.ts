import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { Readable } from "node:stream";
import path from "node:path";
import { NextResponse } from "next/server";
import { getRawPlatformPost, getRawUpload } from "@/lib/db";
import { EXPORT_DIR, UPLOAD_DIR, safeJoin } from "@/lib/paths";
import type { Platform } from "@/lib/types";

export const runtime = "nodejs";

export async function GET(request: Request, context: { params: Promise<{ id: string; variant: string }> }) {
  try {
    const { id, variant } = await context.params;
    const upload = getRawUpload(id);
    if (!upload) return NextResponse.json({ error: "Not found" }, { status: 404 });
    let filename: string;
    let base = EXPORT_DIR;
    let contentType = "video/mp4";
    if (variant === "thumbnail") {
      filename = String(upload.thumbnail_filename); contentType = "image/jpeg";
    } else if (variant === "preview") {
      filename = `${id}-youtube.mp4`;
    } else if (["youtube", "tiktok", "instagram"].includes(variant)) {
      const post = getRawPlatformPost(id, variant as Platform);
      if (!post?.export_filename) return NextResponse.json({ error: "Not found" }, { status: 404 });
      filename = String(post.export_filename);
    } else if (variant === "original") {
      filename = String(upload.stored_filename); base = UPLOAD_DIR;
    } else return NextResponse.json({ error: "Not found" }, { status: 404 });
    const filePath = safeJoin(base, filename);
    const info = await stat(filePath);
    const download = new URL(request.url).searchParams.get("download") === "1";
    const range = request.headers.get("range");
    if (range && !download && contentType.startsWith("video/")) {
      const match = /bytes=(\d+)-(\d*)/.exec(range);
      if (!match) return new NextResponse(null, { status: 416, headers: { "Content-Range": `bytes */${info.size}` } });
      const start = Number(match[1]);
      const end = match[2] ? Math.min(Number(match[2]), info.size - 1) : info.size - 1;
      if (start > end || start >= info.size) return new NextResponse(null, { status: 416, headers: { "Content-Range": `bytes */${info.size}` } });
      const stream = Readable.toWeb(createReadStream(filePath, { start, end })) as ReadableStream;
      return new NextResponse(stream, { status: 206, headers: { "Content-Type": contentType, "Content-Length": String(end - start + 1), "Content-Range": `bytes ${start}-${end}/${info.size}`, "Accept-Ranges": "bytes", "Cache-Control": "private, max-age=3600" } });
    }
    const body = Readable.toWeb(createReadStream(filePath)) as ReadableStream;
    return new NextResponse(body, { headers: {
      "Content-Type": contentType, "Content-Length": String(info.size), "Accept-Ranges": "bytes", "Cache-Control": "private, max-age=3600",
      ...(download ? { "Content-Disposition": `attachment; filename="${path.basename(filename)}"` } : {}),
    }});
  } catch {
    return NextResponse.json({ error: "Media is unavailable." }, { status: 404 });
  }
}
