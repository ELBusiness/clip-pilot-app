export const PLATFORMS = ["youtube", "tiktok", "instagram"] as const;
export type Platform = (typeof PLATFORMS)[number];

export type PostStatus =
  | "READY"
  | "NEEDS_ACCOUNT_CONNECTION"
  | "API_NOT_SUPPORTED"
  | "MANUAL_POST_REQUIRED"
  | "PROCESSING"
  | "POSTED"
  | "FAILED";

export type PlatformInput = {
  enabled: boolean;
  caption: string;
  hashtags: string[];
  privacy: string;
  scheduledAt: string | null;
  useThumbnail: boolean;
};

export type UploadRecord = {
  id: string;
  originalFilename: string;
  caption: string;
  hashtags: string[];
  createdAt: string;
  durationSeconds: number;
  width: number;
  height: number;
  fileSizeBytes: number;
  isVertical: boolean;
  thumbnailUrl: string | null;
  previewUrl: string;
  platforms: Array<{
    platform: Platform;
    enabled: boolean;
    caption: string;
    hashtags: string[];
    privacy: string;
    scheduledAt: string | null;
    useThumbnail: boolean;
    status: PostStatus;
    downloadUrl: string | null;
    postedUrl: string | null;
    error: string | null;
  }>;
};
