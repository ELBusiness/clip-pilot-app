import { NextResponse } from "next/server";
import { setYouTubeReadyIfConnected } from "@/lib/db";
import { tokenStatus } from "@/lib/token-vault";

export const dynamic = "force-dynamic";
export async function GET() {
  try {
    const status = tokenStatus("youtube");
    setYouTubeReadyIfConnected(status.connected);
    return NextResponse.json({ ...status, approved: status.connected, configured: Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.APP_ENCRYPTION_KEY) });
  } catch (error) {
    return NextResponse.json({ connected: false, configured: false, approved: false, error: error instanceof Error ? error.message : "Token storage error" });
  }
}
