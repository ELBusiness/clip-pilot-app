import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { youtubeAuthUrl } from "@/platforms/youtube/client";

export async function GET() {
  try {
    const state = randomBytes(24).toString("base64url");
    const response = NextResponse.redirect(youtubeAuthUrl(state));
    response.cookies.set("youtube_oauth_state", state, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 600, path: "/" });
    return response;
  } catch (error) {
    return NextResponse.redirect(new URL(`/?youtube_error=${encodeURIComponent(error instanceof Error ? error.message : "OAuth setup failed")}`, process.env.GOOGLE_REDIRECT_URI || "http://localhost:3000"));
  }
}
