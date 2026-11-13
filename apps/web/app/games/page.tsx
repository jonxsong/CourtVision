import { DemoBadge } from "@/components/demo-badge";
import { GameCard } from "@/components/game-card";
import { games } from "@/lib/demo-data";
import liveSnapshot from "@/lib/live-games.json";
import type { Game } from "@/lib/types";

export const metadata = { title: "Game Intelligence" };
export default function GamesPage() {
  const liveGames = liveSnapshot.games as Game[];
  const fetchedAt = new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Los_Angeles" }).format(new Date(liveSnapshot.fetchedAt));
  return <><section className="page-hero"><div className="shell page-hero-row"><div><span className="kicker">Game intelligence</span><h1>The game is more<br />than the final score.</h1></div><div><span className="live-data-badge"><i /> Verified free feed</span><p>Today&apos;s NBA scores come from a server-generated BALLDONTLIE snapshot. Historical possession replay remains an explicitly labeled CourtVision demonstration.</p></div></div></section><section className="content-section shell live-slate"><div className="date-rule"><span>Real NBA slate · {liveSnapshot.gameDate}</span><b>Updated {fetchedAt}</b></div><div className="games-grid games-page-grid">{liveGames.map(game => <GameCard game={game} source="live" linked={false} key={game.id} />)}</div><p className="snapshot-note">Static public snapshot · scores refresh on the next verified deployment while the server-backed runtime is being prepared.</p></section><section className="content-section shell demo-slate"><div className="date-rule"><span><DemoBadge compact /> Interactive replay lab</span><b>Fictional 2025–26 demonstration season</b></div><div className="games-grid games-page-grid">{games.map(game => <GameCard game={game} key={game.id} />)}</div></section></>;
}
