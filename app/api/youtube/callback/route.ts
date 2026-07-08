import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { exchangeCode } from "@/platforms/youtube/client";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const stateCookie = (await cookies()).get("youtube_oauth_state")?.value;
  const state = url.searchParams.get("state");
  const code = url.searchParams.get("code");
  try {
    if (!state || !stateCookie || state !== stateCookie) throw new Error("OAuth state validation failed. Please try connecting again.");
    if (!code) throw new Error(url.searchParams.get("error") || "Google did not return an authorization code.");
    const label = await exchangeCode(code);
    const response = NextResponse.redirect(new URL(`/?youtube_connected=${encodeURIComponent(label)}`, request.url));
    response.cookies.delete("youtube_oauth_state");
    return response;
  } catch (error) {
    return NextResponse.redirect(new URL(`/?youtube_error=${encodeURIComponent(error instanceof Error ? error.message : "Connection failed")}`, request.url));
  }
}
