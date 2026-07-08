import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { DATA_DIR, ROOT } from "./paths";
import type { Platform, PlatformInput, PostStatus, UploadRecord } from "./types";

const globalDb = globalThis as unknown as { clipPilotDb?: DatabaseSync };

function initDb() {
  const database = new DatabaseSync(path.join(DATA_DIR, "clip-pilot.db"));
  database.exec("PRAGMA busy_timeout = 10000;");
  database.exec(readFileSync(path.join(ROOT, "db", "schema.sql"), "utf8"));
  seedGroups(database);
  return database;
}

export const db = globalDb.clipPilotDb ?? initDb();
if (process.env.NODE_ENV !== "production") globalDb.clipPilotDb = db;

function seedGroups(database: DatabaseSync) {
  const groups: Record<string, string[]> = {
    "General gaming": ["gaming", "gamer", "gamingclips", "videogames"],
    "Funny clips": ["funny", "gamingfails", "funnyclips", "lol"],
    "Horror games": ["horrorgaming", "scarygames", "jumpscare", "horror"],
    "Viral / meme style": ["viral", "meme", "fyp", "trending"],
  };
  const statement = database.prepare("INSERT OR IGNORE INTO hashtag_groups (id,name,hashtags_json,is_system,created_at) VALUES (?,?,?,?,?)");
  for (const [name, tags] of Object.entries(groups)) {
    statement.run(randomUUID(), name, JSON.stringify(tags), 1, new Date().toISOString());
  }
}

export function createUpload(input: {
  id: string; originalFilename: string; storedFilename: string; caption: string; hashtags: string[];
  createdAt: string; durationSeconds: number; width: number; height: number; fileSizeBytes: number;
  isVertical: boolean; thumbnailFilename: string; platforms: Record<Platform, PlatformInput>;
}) {
  db.exec("BEGIN");
  try {
    db.prepare(`INSERT INTO uploads (id,original_filename,stored_filename,caption,hashtags_json,created_at,duration_seconds,width,height,file_size_bytes,is_vertical,thumbnail_filename)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`).run(
      input.id, input.originalFilename, input.storedFilename, input.caption, JSON.stringify(input.hashtags), input.createdAt,
      input.durationSeconds, input.width, input.height, input.fileSizeBytes, input.isVertical ? 1 : 0, input.thumbnailFilename,
    );
    const insertPost = db.prepare(`INSERT INTO platform_posts
      (id,upload_id,platform,enabled,caption,hashtags_json,privacy,scheduled_at,use_thumbnail,status,export_filename,updated_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`);
    for (const [platform, settings] of Object.entries(input.platforms) as [Platform, PlatformInput][]) {
      const status: PostStatus = settings.enabled ? "NEEDS_ACCOUNT_CONNECTION" : "READY";
      insertPost.run(randomUUID(), input.id, platform, settings.enabled ? 1 : 0, settings.caption, JSON.stringify(settings.hashtags),
        settings.privacy, settings.scheduledAt, settings.useThumbnail ? 1 : 0, status, `${input.id}-${platform}.mp4`, input.createdAt);
    }
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

export function setYouTubeReadyIfConnected(connected: boolean) {
  setPlatformReadyIfConnected("youtube", connected);
}

export function setPlatformReadyIfConnected(platform: Platform, connected: boolean) {
  const now = new Date().toISOString();
  if (connected) {
    db.prepare("UPDATE platform_posts SET status='READY', updated_at=? WHERE platform=? AND enabled=1 AND status IN ('NEEDS_ACCOUNT_CONNECTION','MANUAL_POST_REQUIRED')")
      .run(now, platform);
  } else {
    db.prepare("UPDATE platform_posts SET status='NEEDS_ACCOUNT_CONNECTION', updated_at=? WHERE platform=? AND enabled=1 AND status IN ('READY','MANUAL_POST_REQUIRED')")
      .run(now, platform);
  }
}

export function updatePlatformPost(uploadId: string, platform: Platform, values: { status: PostStatus; postedUrl?: string | null; error?: string | null }) {
  db.prepare("UPDATE platform_posts SET status=?, posted_url=?, error=?, updated_at=? WHERE upload_id=? AND platform=?")
    .run(values.status, values.postedUrl ?? null, values.error ?? null, new Date().toISOString(), uploadId, platform);
}

export function getRawUpload(id: string) {
  return db.prepare("SELECT * FROM uploads WHERE id=?").get(id) as Record<string, unknown> | undefined;
}

export function getRawPlatformPost(uploadId: string, platform: Platform) {
  return db.prepare("SELECT * FROM platform_posts WHERE upload_id=? AND platform=?").get(uploadId, platform) as Record<string, unknown> | undefined;
}

export function listUploads(limit = 25): UploadRecord[] {
  const uploads = db.prepare("SELECT * FROM uploads ORDER BY created_at DESC LIMIT ?").all(limit) as Record<string, unknown>[];
  const posts = db.prepare("SELECT * FROM platform_posts WHERE upload_id=? ORDER BY platform");
  return uploads.map((row) => ({
    id: String(row.id), originalFilename: String(row.original_filename), caption: String(row.caption),
    hashtags: JSON.parse(String(row.hashtags_json)), createdAt: String(row.created_at), durationSeconds: Number(row.duration_seconds),
    width: Number(row.width), height: Number(row.height), fileSizeBytes: Number(row.file_size_bytes), isVertical: Boolean(row.is_vertical),
    thumbnailUrl: row.thumbnail_filename ? `/api/media/${row.id}/thumbnail` : null,
    previewUrl: `/api/media/${row.id}/preview`,
    platforms: (posts.all(String(row.id)) as Record<string, unknown>[]).map((post) => ({
      platform: post.platform as Platform, enabled: Boolean(post.enabled), caption: String(post.caption),
      hashtags: JSON.parse(String(post.hashtags_json)), privacy: String(post.privacy), scheduledAt: post.scheduled_at ? String(post.scheduled_at) : null,
      useThumbnail: Boolean(post.use_thumbnail), status: post.status as PostStatus,
      downloadUrl: post.export_filename ? `/api/media/${row.id}/${post.platform}?download=1` : null,
      postedUrl: post.posted_url ? String(post.posted_url) : null, error: post.error ? String(post.error) : null,
    })),
  }));
}

export function listHashtagGroups() {
  return (db.prepare("SELECT id,name,hashtags_json,is_system FROM hashtag_groups ORDER BY is_system DESC,name").all() as Record<string, unknown>[])
    .map((row) => ({ id: String(row.id), name: String(row.name), hashtags: JSON.parse(String(row.hashtags_json)), isSystem: Boolean(row.is_system) }));
}

export function saveHashtagGroup(name: string, hashtags: string[]) {
  db.prepare("INSERT INTO hashtag_groups (id,name,hashtags_json,is_system,created_at) VALUES (?,?,?,?,?) ON CONFLICT(name) DO UPDATE SET hashtags_json=excluded.hashtags_json")
    .run(randomUUID(), name, JSON.stringify(hashtags), 0, new Date().toISOString());
}
