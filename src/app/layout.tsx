import type { Metadata, Viewport } from "next";
import { AppProvider } from "@/components/app-context";
import { Shell } from "@/components/shell";
import "./globals.css";
import { WebMCP } from "@/components/webmcp";
export const metadata: Metadata = {
  title: "ManhwaHub — Your reading space",
  description:
    "A personal manga, manhwa and manhua reader with original demo stories, multiple sources, and a local library.",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/favicon.svg", apple: "/icon-192.png" },
  appleWebApp: { capable: true, statusBarStyle: "black-translucent" },
};
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#101114",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <AppProvider>
          <WebMCP />
          <Shell>{children}</Shell>
        </AppProvider>
      </body>
    </html>
  );
}
