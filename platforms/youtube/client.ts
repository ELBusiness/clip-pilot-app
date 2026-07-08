import { createReadStream } from "node:fs";
import { google } from "googleapis";
import type { Credentials } from "google-auth-library";
import { readToken, storeToken } from "@/lib/token-vault";

export function oauthClient() {
  const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI } = process.env;
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) throw new Error("YouTube OAuth is not configured. Add Google credentials to .env.");
  return new google.auth.OAuth2(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI || "http://localhost:3000/api/youtube/callback");
}

export function youtubeAuthUrl(state: string) {
  return oauthClient().generateAuthUrl({
    access_type: "offline", prompt: "consent", state,
    scope: ["https://www.googleapis.com/auth/youtube.upload"],
  });
}

export async function exchangeCode(code: string) {
  const client = oauthClient();
  const { tokens } = await client.getToken(code);
  if (!tokens.refresh_token) throw new Error("Google did not return a refresh token. Revoke the app grant and connect again.");
  client.setCredentials(tokens);
  const youtube = google.youtube({ version: "v3", auth: client });
  const channel = await youtube.channels.list({ part: ["snippet"], mine: true });
  const label = channel.data.items?.[0]?.snippet?.title || "YouTube channel";
  storeToken("youtube", tokens, label);
  return label;
}

function authorizedClient() {
  const tokens = readToken<Credentials>("youtube");
  if (!tokens) throw new Error("Connect a YouTube account before uploading.");
  const client = oauthClient();
  client.setCredentials(tokens);
  client.on("tokens", (fresh) => storeToken("youtube", { ...tokens, ...fresh }));
  return client;
}

export async function uploadYouTube(input: {
  filePath: string; title: string; description: string; tags: string[]; privacy: string;
  scheduledAt: string | null; thumbnailPath?: string;
}) {
  const auth = authorizedClient();
  const youtube = google.youtube({ version: "v3", auth });
  const scheduled = input.scheduledAt && new Date(input.scheduledAt).getTime() > Date.now();
  const privacyStatus = scheduled ? "private" : (["private", "unlisted", "public"].includes(input.privacy) ? input.privacy : "private");
  const response = await youtube.videos.insert({
    part: ["snippet", "status"],
    requestBody: {
      snippet: { title: input.title, description: input.description, tags: input.tags.map((tag) => tag.replace(/^#/, "")), categoryId: "20" },
      status: { privacyStatus, publishAt: scheduled ? new Date(input.scheduledAt!).toISOString() : undefined, selfDeclaredMadeForKids: false },
    },
    media: { mimeType: "video/mp4", body: createReadStream(input.filePath) },
  });
  const id = response.data.id;
  if (!id) throw new Error("YouTube accepted the upload but did not return a video ID.");
  if (input.thumbnailPath) {
    try {
      await youtube.thumbnails.set({ videoId: id, media: { mimeType: "image/jpeg", body: createReadStream(input.thumbnailPath) } });
    } catch (error) {
      console.warn("Custom thumbnail was not applied:", error);
    }
  }
  return { id, url: `https://youtu.be/${id}` };
}
