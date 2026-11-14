import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const primaryRoutes = ["", "/players", "/compare", "/games", "/shots", "/insights", "/operations"];
  return primaryRoutes.map((path, index) => ({
      url: `${SITE_URL}${path}`,
      changeFrequency: (path === "/games" ? "daily" : "weekly") as "daily" | "weekly",
      priority: index === 0 ? 1 : 0.8,
    }));
}
