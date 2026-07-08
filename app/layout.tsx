import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Clip Pilot — Short-form publishing workspace",
  description: "Prepare and safely publish short-form video with official platform workflows.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
