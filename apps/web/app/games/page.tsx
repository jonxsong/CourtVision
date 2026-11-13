import { DemoBadge } from "@/components/demo-badge";
import { GameCard } from "@/components/game-card";
import { games } from "@/lib/demo-data";

export const metadata = { title: "Game Intelligence" };
export default function GamesPage() { return <><section className="page-hero"><div className="shell page-hero-row"><div><span className="kicker">Game intelligence</span><h1>The game is more<br />than the final score.</h1></div><div><DemoBadge /><p>Study runs, lead changes, and the events behind every swing. Historical replay uses the same normalized event contract intended for live data.</p></div></div></section><section className="content-section shell"><div className="date-rule"><span>Demonstration slate</span><b>March 17–21, 2026</b></div><div className="games-grid games-page-grid">{games.map(game => <GameCard game={game} key={game.id} />)}</div></section></>; }
