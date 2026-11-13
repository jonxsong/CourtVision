import type { MetadataRoute } from "next";
import { games, players } from "@/lib/demo-data";

const siteUrl = "https://courtvision-analytics.perkyaisle4.chatgpt.site";
export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const primaryRoutes = ["", "/players", "/compare", "/games", "/shots", "/insights", "/operations"];
  return [
    ...primaryRoutes.map((path, index) => ({
      url: `${siteUrl}${path}`,
      changeFrequency: (path === "/games" ? "daily" : "weekly") as "daily" | "weekly",
      priority: index === 0 ? 1 : 0.8,
    })),
    ...players.map((player) => ({
      url: `${siteUrl}/players/${player.id}`,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })),
    ...games.map((game) => ({
      url: `${siteUrl}/games/${game.id}`,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })),
  ];
}
