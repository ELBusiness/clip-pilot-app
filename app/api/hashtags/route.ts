import { NextResponse } from "next/server";
import { z } from "zod";
import { listHashtagGroups, saveHashtagGroup } from "@/lib/db";
import { normalizeHashtags } from "@/lib/captions";

export const dynamic = "force-dynamic";

export async function GET() { return NextResponse.json({ groups: listHashtagGroups() }); }

export async function POST(request: Request) {
  try {
    const input = z.object({ name: z.string().trim().min(1).max(50), hashtags: z.union([z.string(), z.array(z.string())]) }).parse(await request.json());
    const hashtags = normalizeHashtags(input.hashtags);
    if (!hashtags.length) return NextResponse.json({ error: "Add at least one hashtag." }, { status: 400 });
    saveHashtagGroup(input.name, hashtags);
    return NextResponse.json({ groups: listHashtagGroups() }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not save group." }, { status: 400 });
  }
}
