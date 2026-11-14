import { LiveScoreboard, type LiveGamesPayload } from "@/components/live-scoreboard";
import liveSnapshot from "@/lib/live-games.json";

export const metadata = { title: "Game Intelligence", alternates: { canonical: "/games" } };
export default function GamesPage() {
  const initialData = liveSnapshot as LiveGamesPayload;
  return <><section className="page-hero"><div className="shell page-hero-row"><div><span className="kicker">Game intelligence</span><h1>The game is more<br />than the final score.</h1></div><div><span className="live-data-badge"><i /> Secure live feed</span><p>Today&apos;s real NBA schedule, game state, and scores refresh through CourtVision&apos;s server-side data service. Select any matchup for its live detail view.</p></div></div></section><LiveScoreboard initialData={initialData} /></>;
}
