import { open, stat } from "node:fs/promises";
import { readToken, storeToken } from "@/lib/token-vault";

type TikTokToken = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  refresh_expires_in: number;
  open_id: string;
  scope: string;
  token_type: string;
  expires_at: number;
  display_name?: string;
};

type CreatorInfo = {
  creator_avatar_url?: string;
  creator_username?: string;
  creator_nickname?: string;
  privacy_level_options: string[];
  comment_disabled?: boolean;
  duet_disabled?: boolean;
  stitch_disabled?: boolean;
  max_video_post_duration_sec?: number;
};

function config() {
  const clientKey = process.env.TIKTOK_CLIENT_KEY;
  const clientSecret = process.env.TIKTOK_CLIENT_SECRET;
  const redirectUri = process.env.TIKTOK_REDIRECT_URI || "http://localhost:3000/api/tiktok/callback";
  if (!clientKey || !clientSecret) throw new Error("TikTok developer credentials are not configured.");
  return { clientKey, clientSecret, redirectUri };
}

export function tiktokAuthUrl(state: string, codeChallenge: string) {
  const { clientKey, redirectUri } = config();
  const query = new URLSearchParams({
    client_key: clientKey,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "user.info.basic,video.upload",
    state,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
  });
  return `https://www.tiktok.com/v2/auth/authorize/?${query}`;
}

async function tokenRequest(parameters: Record<string, string>) {
  const { clientKey, clientSecret } = config();
  const response = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_key: clientKey, client_secret: clientSecret, ...parameters }),
  });
  const result = await response.json() as Partial<TikTokToken> & { error?: string; error_description?: string };
  if (!response.ok || result.error || !result.access_token) throw new Error(result.error_description || result.error || "TikTok token exchange failed.");
  return { ...result, expires_at: Date.now() + Number(result.expires_in || 86400) * 1000 } as TikTokToken;
}

async function userInfo(accessToken: string) {
  const response = await fetch("https://open.tiktokapis.com/v2/user/info/?fields=open_id,display_name,avatar_url", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const result = await response.json() as { data?: { user?: { display_name?: string } }; error?: { code?: string; message?: string } };
  if (!response.ok || (result.error?.code && result.error.code !== "ok")) throw new Error(result.error?.message || "TikTok profile lookup failed.");
  return result.data?.user?.display_name || "TikTok account";
}

export async function exchangeTikTokCode(code: string, codeVerifier: string) {
  const { redirectUri } = config();
  const token = await tokenRequest({ code, code_verifier: codeVerifier, grant_type: "authorization_code", redirect_uri: redirectUri });
  const label = await userInfo(token.access_token);
  token.display_name = label;
  storeToken("tiktok", token, label);
  return label;
}

async function authorizedToken() {
  let token = readToken<TikTokToken>("tiktok");
  if (!token) throw new Error("Connect a TikTok account before posting.");
  if (token.expires_at < Date.now() + 5 * 60_000) {
    const fresh = await tokenRequest({ grant_type: "refresh_token", refresh_token: token.refresh_token });
    token = { ...token, ...fresh };
    storeToken("tiktok", token, token.display_name);
  }
  if (!token.scope.split(",").includes("video.upload")) throw new Error("The connected TikTok account did not grant the video.publish scope.");
  return token;
}

async function tiktokApi<T>(url: string, accessToken: string, body: unknown): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json; charset=UTF-8" },
    body: JSON.stringify(body),
  });
  const result = await response.json() as T & { error?: { code?: string; message?: string; log_id?: string } };
  if (!response.ok || (result.error?.code && result.error.code !== "ok")) {
    throw new Error(result.error?.message || result.error?.code || "TikTok API request failed.");
  }
  return result;
}

export async function getTikTokCreatorInfo(): Promise<CreatorInfo> {
  const token = await authorizedToken();
  const result = await tiktokApi<{ data: CreatorInfo }>("https://open.tiktokapis.com/v2/post/publish/creator_info/query/", token.access_token, {});
  return result.data;
}

function privacyValue(value: string) {
  return ({ public: "PUBLIC_TO_EVERYONE", friends: "MUTUAL_FOLLOW_FRIENDS", followers: "FOLLOWER_OF_CREATOR", private: "SELF_ONLY" } as Record<string, string>)[value] || value;
}

export async function directPostTikTok(input: { filePath: string; caption: string; privacy: string; durationSeconds: number }) {
  const token = await authorizedToken();
  const creatorResult = await tiktokApi<{ data: CreatorInfo }>("https://open.tiktokapis.com/v2/post/publish/creator_info/query/", token.access_token, {});
  const creator = creatorResult.data;
  if (creator.max_video_post_duration_sec && input.durationSeconds > creator.max_video_post_duration_sec) {
    throw new Error(`This TikTok account allows videos up to ${creator.max_video_post_duration_sec} seconds.`);
  }
  const privacy = privacyValue(input.privacy);
  if (!creator.privacy_level_options?.includes(privacy)) {
    throw new Error(`TikTok does not allow the selected privacy level. Available options: ${creator.privacy_level_options?.join(", ") || "none"}.`);
  }
  const file = await stat(input.filePath);
  const chunkSize = Math.min(file.size, 10 * 1024 * 1024);
  const totalChunks = Math.ceil(file.size / chunkSize);
  const initialized = await tiktokApi<{ data: { publish_id: string; upload_url: string } }>(
    "https://open.tiktokapis.com/v2/post/publish/video/init/",
    token.access_token,
    {
      post_info: {
        title: input.caption.slice(0, 2200), privacy_level: privacy,
        disable_duet: Boolean(creator.duet_disabled), disable_comment: Boolean(creator.comment_disabled),
        disable_stitch: Boolean(creator.stitch_disabled), brand_content_toggle: false, brand_organic_toggle: false,
      },
      source_info: { source: "FILE_UPLOAD", video_size: file.size, chunk_size: chunkSize, total_chunk_count: totalChunks },
    },
  );
  const handle = await open(input.filePath, "r");
  try {
    for (let offset = 0; offset < file.size; offset += chunkSize) {
      const length = Math.min(chunkSize, file.size - offset);
      const buffer = Buffer.allocUnsafe(length);
      await handle.read(buffer, 0, length, offset);
      const upload = await fetch(initialized.data.upload_url, {
        method: "PUT",
        headers: { "Content-Type": "video/mp4", "Content-Length": String(length), "Content-Range": `bytes ${offset}-${offset + length - 1}/${file.size}` },
        body: buffer,
      });
      if (!upload.ok) throw new Error(`TikTok video transfer failed (${upload.status}).`);
    }
  } finally { await handle.close(); }
  return { publishId: initialized.data.publish_id, creator };
}

export async function fetchTikTokPublishStatus(publishId: string) {
  const token = await authorizedToken();
  return tiktokApi<{ data: { status: string; fail_reason?: string; publicaly_available_post_id?: string[] } }>(
    "https://open.tiktokapis.com/v2/post/publish/status/fetch/", token.access_token, { publish_id: publishId },
  );
}
