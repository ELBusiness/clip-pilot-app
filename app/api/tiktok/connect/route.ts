import { createHash, randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { tiktokAuthUrl } from "@/platforms/tiktok/client";

export async function GET(request: Request) {
  try {
    const state = randomBytes(24).toString("base64url");
    const codeVerifier = randomBytes(48).toString("base64url");
    const codeChallenge = createHash("sha256").update(codeVerifier).digest("base64url");
    const response = NextResponse.redirect(tiktokAuthUrl(state, codeChallenge));
    response.cookies.set("tiktok_oauth_state", state, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 600, path: "/" });
    response.cookies.set("tiktok_oauth_verifier", codeVerifier, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 600, path: "/" });
    return response;
  } catch (error) {
    return NextResponse.redirect(new URL(`/?tiktok_error=${encodeURIComponent(error instanceof Error ? error.message : "OAuth setup failed")}`, request.url));
  }
}
