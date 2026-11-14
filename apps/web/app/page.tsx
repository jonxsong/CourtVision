import { HomeLiveDashboard } from "@/components/home-live-dashboard";
import type { LiveGamesPayload } from "@/lib/live-data";
import liveSnapshot from "@/lib/live-games.json";

export const metadata = { alternates: { canonical: "/" } };

export default function HomePage() {
  return <HomeLiveDashboard initialGames={liveSnapshot as LiveGamesPayload} />;
}
