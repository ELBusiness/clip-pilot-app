import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { db } from "./db";

function key() {
  const value = process.env.APP_ENCRYPTION_KEY;
  if (!value) throw new Error("APP_ENCRYPTION_KEY is not configured.");
  const decoded = Buffer.from(value, "base64");
  if (decoded.length !== 32) throw new Error("APP_ENCRYPTION_KEY must be a base64-encoded 32-byte key.");
  return decoded;
}

export function encrypt(payload: unknown) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const body = Buffer.concat([cipher.update(JSON.stringify(payload), "utf8"), cipher.final()]);
  return [iv, cipher.getAuthTag(), body].map((part) => part.toString("base64url")).join(".");
}

export function decrypt<T>(payload: string): T {
  const [iv, tag, body] = payload.split(".").map((part) => Buffer.from(part, "base64url"));
  if (!iv || !tag || !body) throw new Error("Invalid encrypted token payload.");
  const decipher = createDecipheriv("aes-256-gcm", key(), iv);
  decipher.setAuthTag(tag);
  return JSON.parse(Buffer.concat([decipher.update(body), decipher.final()]).toString("utf8")) as T;
}

export function storeToken(platform: string, payload: unknown, accountLabel?: string) {
  db.prepare(`INSERT INTO oauth_tokens (platform,encrypted_payload,account_label,updated_at) VALUES (?,?,?,?)
    ON CONFLICT(platform) DO UPDATE SET encrypted_payload=excluded.encrypted_payload,account_label=excluded.account_label,updated_at=excluded.updated_at`)
    .run(platform, encrypt(payload), accountLabel || null, new Date().toISOString());
}

export function readToken<T>(platform: string): T | null {
  const row = db.prepare("SELECT encrypted_payload FROM oauth_tokens WHERE platform=?").get(platform) as { encrypted_payload: string } | undefined;
  return row ? decrypt<T>(row.encrypted_payload) : null;
}

export function tokenStatus(platform: string) {
  const row = db.prepare("SELECT account_label,updated_at FROM oauth_tokens WHERE platform=?").get(platform) as { account_label: string | null; updated_at: string } | undefined;
  return row ? { connected: true, accountLabel: row.account_label, updatedAt: row.updated_at } : { connected: false, accountLabel: null, updatedAt: null };
}
