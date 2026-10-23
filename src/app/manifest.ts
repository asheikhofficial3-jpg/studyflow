import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "StudyFlow — Agentic AI Study Planner",
    short_name: "StudyFlow",
    description: "Turn learning goals into plans, tasks and focus sessions. Installable on phone, PC and TV browsers; Alexa+ ready via its self-hosted MCP server.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#070d1f",
    theme_color: "#070d1f",
    categories: ["education", "productivity"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
