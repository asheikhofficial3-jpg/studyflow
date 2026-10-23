import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";
import { StoreProvider } from "@/lib/store";
import Shell from "@/components/Shell";
import PwaRegister from "@/components/PwaRegister";

const manrope = Manrope({ variable: "--font-manrope", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "StudyFlow — Agentic AI Study Planner",
  description: "Turn learning goals into actionable plans, tasks, focus sessions and real progress. Installable as an app on phone, PC and TV browsers; Alexa+ ready via its self-hosted MCP server.",
  manifest: "/manifest.webmanifest",
  themeColor: "#070d1f",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "StudyFlow" },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${manrope.variable} h-full antialiased`}>
      <body className="min-h-full">
        <StoreProvider>
          <Shell>{children}</Shell>
        </StoreProvider>
        <PwaRegister />
      </body>
    </html>
  );
}
