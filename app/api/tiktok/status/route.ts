import { NextResponse } from "next/server";
import { tokenStatus } from "@/lib/token-vault";
import { setPlatformReadyIfConnected } from "@/lib/db";
import { getTikTokCreatorInfo } from "@/platforms/tiktok/client";

export const dynamic = "force-dynamic";
export async function GET() {
  const configured = Boolean(process.env.TIKTOK_CLIENT_KEY && process.env.TIKTOK_CLIENT_SECRET && process.env.APP_ENCRYPTION_KEY);
  try {
    const status = tokenStatus("tiktok");
    if (status.connected && configured) {
      try {
        const creator = await getTikTokCreatorInfo();
        setPlatformReadyIfConnected("tiktok", Boolean(creator?.privacy_level_options?.length));
        return NextResponse.json({ ...status, configured, approved: Boolean(creator?.privacy_level_options?.length), creator });
      } catch (error) {
        setPlatformReadyIfConnected("tiktok", false);
        return NextResponse.json({ ...status, configured, approved: false, creator: null, error: error instanceof Error ? error.message : "TikTok approval check failed" });
      }
    }
    setPlatformReadyIfConnected("tiktok", false);
    return NextResponse.json({ ...status, configured, approved: false, creator: null });
  } catch (error) {
    return NextResponse.json({ connected: false, configured, approved: false, creator: null, error: error instanceof Error ? error.message : "TikTok connection error" });
  }
}
