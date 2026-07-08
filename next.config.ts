import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: { serverActions: { bodySizeLimit: "500mb" } },
  serverExternalPackages: ["googleapis"],
  turbopack: { root: process.cwd() },
};

export default nextConfig;
