import type { MetadataRoute } from "next";

const siteUrl = "https://courtvision-analytics.perkyaisle4.chatgpt.site";
export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const primaryRoutes = ["", "/players", "/compare", "/games", "/shots", "/insights", "/operations"];
  return primaryRoutes.map((path, index) => ({
      url: `${siteUrl}${path}`,
      changeFrequency: (path === "/games" ? "daily" : "weekly") as "daily" | "weekly",
      priority: index === 0 ? 1 : 0.8,
    }));
}
