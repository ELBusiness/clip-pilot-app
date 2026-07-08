import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { exchangeInstagramCode } from "@/platforms/instagram/client";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const stateCookie = (await cookies()).get("instagram_oauth_state")?.value;
  try {
    if (!url.searchParams.get("state") || url.searchParams.get("state") !== stateCookie) throw new Error("OAuth state validation failed. Please try connecting again.");
    const code = url.searchParams.get("code");
    if (!code) throw new Error(url.searchParams.get("error_description") || "Instagram did not return an authorization code.");
    const label = await exchangeInstagramCode(code);
    const response = NextResponse.redirect(new URL(`/?instagram_connected=${encodeURIComponent(label)}`, request.url));
    response.cookies.delete("instagram_oauth_state");
    return response;
  } catch (error) {
    return NextResponse.redirect(new URL(`/?instagram_error=${encodeURIComponent(error instanceof Error ? error.message : "Connection failed")}`, request.url));
  }
}
