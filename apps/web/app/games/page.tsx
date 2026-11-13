import { DemoBadge } from "@/components/demo-badge";
import { GameCard } from "@/components/game-card";
import { LiveScoreboard, type LiveGamesPayload } from "@/components/live-scoreboard";
import { games } from "@/lib/demo-data";
import liveSnapshot from "@/lib/live-games.json";

export const metadata = { title: "Game Intelligence" };
export default function GamesPage() {
  const initialData = liveSnapshot as LiveGamesPayload;
  return <><section className="page-hero"><div className="shell page-hero-row"><div><span className="kicker">Game intelligence</span><h1>The game is more<br />than the final score.</h1></div><div><span className="live-data-badge"><i /> Secure live feed</span><p>Today&apos;s NBA scores refresh through CourtVision&apos;s server-side data service. Historical possession replay remains an explicitly labeled demonstration.</p></div></div></section><LiveScoreboard initialData={initialData} /><section className="content-section shell demo-slate"><div className="date-rule"><span><DemoBadge compact /> Interactive replay lab</span><b>Fictional 2025–26 demonstration season</b></div><div className="games-grid games-page-grid">{games.map(game => <GameCard game={game} key={game.id} />)}</div></section></>;
}
