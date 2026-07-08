import { NextResponse } from "next/server";
import { tokenStatus } from "@/lib/token-vault";
import { setPlatformReadyIfConnected } from "@/lib/db";

export const dynamic = "force-dynamic";
export async function GET() {
  const configured = Boolean(process.env.INSTAGRAM_CLIENT_ID && process.env.INSTAGRAM_CLIENT_SECRET && process.env.APP_ENCRYPTION_KEY);
  try {
    const status = tokenStatus("instagram");
    setPlatformReadyIfConnected("instagram", status.connected);
    return NextResponse.json({ ...status, configured, approved: status.connected });
  } catch (error) {
    return NextResponse.json({ connected: false, configured, approved: false, error: error instanceof Error ? error.message : "Instagram connection error" });
  }
}
