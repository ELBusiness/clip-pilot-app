import path from "node:path";
import { mkdirSync } from "node:fs";

export const ROOT = process.cwd();
export const DATA_DIR = path.join(ROOT, "data");
export const UPLOAD_DIR = path.join(ROOT, "uploads");
export const EXPORT_DIR = path.join(ROOT, "exports");

for (const directory of [DATA_DIR, UPLOAD_DIR, EXPORT_DIR]) {
  mkdirSync(directory, { recursive: true });
}

export function safeJoin(base: string, filename: string) {
  const resolved = path.resolve(base, filename);
  if (!resolved.startsWith(path.resolve(base) + path.sep)) throw new Error("Invalid file path");
  return resolved;
}
