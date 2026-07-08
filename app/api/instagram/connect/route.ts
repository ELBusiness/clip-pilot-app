import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { instagramAuthUrl } from "@/platforms/instagram/client";

export async function GET(request: Request) {
  try {
    const state = randomBytes(24).toString("base64url");
    const response = NextResponse.redirect(instagramAuthUrl(state));
    response.cookies.set("instagram_oauth_state", state, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 600, path: "/" });
    return response;
  } catch (error) {
    return NextResponse.redirect(new URL(`/?instagram_error=${encodeURIComponent(error instanceof Error ? error.message : "OAuth setup failed")}`, request.url));
  }
}
