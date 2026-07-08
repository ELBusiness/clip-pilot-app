import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { exchangeTikTokCode } from "@/platforms/tiktok/client";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const stateCookie = (await cookies()).get("tiktok_oauth_state")?.value;
  const codeVerifier = (await cookies()).get("tiktok_oauth_verifier")?.value;
  try {
    if (!url.searchParams.get("state") || url.searchParams.get("state") !== stateCookie) throw new Error("OAuth state validation failed. Please try connecting again.");
    const code = url.searchParams.get("code");
    if (!code) throw new Error(url.searchParams.get("error_description") || "TikTok did not return an authorization code.");
    if (!codeVerifier) throw new Error("TikTok OAuth verifier expired. Please try connecting again.");
    const label = await exchangeTikTokCode(code, codeVerifier);
    const response = NextResponse.redirect(new URL(`/?tiktok_connected=${encodeURIComponent(label)}`, request.url));
    response.cookies.delete("tiktok_oauth_state");
    response.cookies.delete("tiktok_oauth_verifier");
    return response;
  } catch (error) {
    return NextResponse.redirect(new URL(`/?tiktok_error=${encodeURIComponent(error instanceof Error ? error.message : "Connection failed")}`, request.url));
  }
}
