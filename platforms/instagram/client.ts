import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { Readable } from "node:stream";
import { readToken, storeToken } from "@/lib/token-vault";

type InstagramToken = {
  access_token: string;
  user_id: string;
  expires_in?: number;
  expires_at: number;
  username?: string;
};

const graphVersion = process.env.META_GRAPH_VERSION || "v25.0";

function config() {
  const clientId = process.env.INSTAGRAM_CLIENT_ID;
  const clientSecret = process.env.INSTAGRAM_CLIENT_SECRET;
  const redirectUri = process.env.INSTAGRAM_REDIRECT_URI || "http://localhost:3000/api/instagram/callback";
  if (!clientId || !clientSecret) throw new Error("Instagram developer credentials are not configured.");
  return { clientId, clientSecret, redirectUri };
}

export function instagramAuthUrl(state: string) {
  const { clientId, redirectUri } = config();
  const query = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "instagram_business_basic,instagram_business_content_publish",
    state,
  });
  return `https://www.instagram.com/oauth/authorize?force_reauth=true&${query}`;
}

async function graph<T>(path: string, accessToken: string, init?: RequestInit) {
  const separator = path.includes("?") ? "&" : "?";
  const response = await fetch(`https://graph.instagram.com/${graphVersion}/${path}${separator}access_token=${encodeURIComponent(accessToken)}`, init);
  const result = await response.json() as T & { error?: { message?: string; type?: string; code?: number } };
  if (!response.ok || result.error) throw new Error(result.error?.message || "Instagram API request failed.");
  return result;
}

export async function exchangeInstagramCode(code: string) {
  const { clientId, clientSecret, redirectUri } = config();
  const response = await fetch("https://api.instagram.com/oauth/access_token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, grant_type: "authorization_code", redirect_uri: redirectUri, code }),
  });
  const short = await response.json() as { access_token?: string; user_id?: string; error_message?: string };
  if (!response.ok || !short.access_token || !short.user_id) throw new Error(short.error_message || "Instagram token exchange failed.");
  const exchange = await fetch(`https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=${encodeURIComponent(clientSecret)}&access_token=${encodeURIComponent(short.access_token)}`);
  const long = await exchange.json() as { access_token?: string; expires_in?: number; error?: { message?: string } };
  if (!exchange.ok || !long.access_token) throw new Error(long.error?.message || "Instagram long-lived token exchange failed.");
  const profile = await graph<{ user_id?: string; id?: string; username?: string }>("me?fields=user_id,username", long.access_token);
  const token: InstagramToken = {
    access_token: long.access_token,
    user_id: profile.user_id || profile.id || short.user_id,
    expires_in: long.expires_in,
    expires_at: Date.now() + Number(long.expires_in || 5_184_000) * 1000,
    username: profile.username,
  };
  storeToken("instagram", token, profile.username || "Instagram professional account");
  return profile.username || "Instagram professional account";
}

async function authorizedToken() {
  let token = readToken<InstagramToken>("instagram");
  if (!token) throw new Error("Connect an Instagram professional account before posting.");
  if (token.expires_at < Date.now() + 7 * 24 * 60 * 60_000) {
    const response = await fetch(`https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=${encodeURIComponent(token.access_token)}`);
    const fresh = await response.json() as { access_token?: string; expires_in?: number; error?: { message?: string } };
    if (!response.ok || !fresh.access_token) throw new Error(fresh.error?.message || "Instagram token refresh failed.");
    token = { ...token, access_token: fresh.access_token, expires_in: fresh.expires_in, expires_at: Date.now() + Number(fresh.expires_in || 5_184_000) * 1000 };
    storeToken("instagram", token, token.username);
  }
  return token;
}

function delay(milliseconds: number) { return new Promise((resolve) => setTimeout(resolve, milliseconds)); }

export async function publishInstagramReel(input: { filePath: string; caption: string }) {
  const token = await authorizedToken();
  const container = await graph<{ id: string }>(`${token.user_id}/media`, token.access_token, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ media_type: "REELS", upload_type: "resumable", caption: input.caption.slice(0, 2200), share_to_feed: "true" }),
  });
  const file = await stat(input.filePath);
  const stream = Readable.toWeb(createReadStream(input.filePath)) as unknown as BodyInit;
  const upload = await fetch(`https://rupload.facebook.com/ig-api-upload/${graphVersion}/${container.id}`, {
    method: "POST",
    headers: { Authorization: `OAuth ${token.access_token}`, file_offset: "0", "Content-Type": "application/octet-stream", "Content-Length": String(file.size) },
    body: stream,
    duplex: "half",
  } as RequestInit & { duplex: "half" });
  if (!upload.ok) throw new Error(`Instagram video transfer failed (${upload.status}): ${(await upload.text()).slice(0, 300)}`);
  let finished = false;
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const status = await graph<{ status_code?: string; status?: string }>(`${container.id}?fields=status_code,status`, token.access_token);
    if (status.status_code === "FINISHED") { finished = true; break; }
    if (status.status_code === "ERROR" || status.status_code === "EXPIRED") throw new Error(status.status || `Instagram container ${status.status_code.toLowerCase()}.`);
    await delay(2_000);
  }
  if (!finished) throw new Error("Instagram is still processing the Reel. Try posting again shortly.");
  const published = await graph<{ id: string }>(`${token.user_id}/media_publish`, token.access_token, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ creation_id: container.id }),
  });
  const media = await graph<{ permalink?: string }>(`${published.id}?fields=permalink`, token.access_token);
  return { id: published.id, url: media.permalink || `https://www.instagram.com/` };
}
