import Dashboard from "@/components/Dashboard";
import { listHashtagGroups, listUploads } from "@/lib/db";
import { tokenStatus } from "@/lib/token-vault";

export const dynamic = "force-dynamic";

export default function Home() {
  const connections = {
    youtube: { connected: false, accountLabel: null as string | null, configured: Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.APP_ENCRYPTION_KEY), approved: true },
    tiktok: { connected: false, accountLabel: null as string | null, configured: Boolean(process.env.TIKTOK_CLIENT_KEY && process.env.TIKTOK_CLIENT_SECRET && process.env.APP_ENCRYPTION_KEY), approved: false },
    instagram: { connected: false, accountLabel: null as string | null, configured: Boolean(process.env.INSTAGRAM_CLIENT_ID && process.env.INSTAGRAM_CLIENT_SECRET && process.env.APP_ENCRYPTION_KEY), approved: false },
  };
  for (const platform of ["youtube", "tiktok", "instagram"] as const) {
    try { Object.assign(connections[platform], tokenStatus(platform), { approved: connections[platform].approved || tokenStatus(platform).connected }); } catch { /* Setup state is shown in the UI. */ }
  }
  return <Dashboard initialUploads={listUploads()} initialGroups={listHashtagGroups()} initialConnections={connections} />;
}
