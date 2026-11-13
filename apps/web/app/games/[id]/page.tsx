import Link from "next/link";
import { notFound } from "next/navigation";
import { DemoBadge } from "@/components/demo-badge";
import { ReplayController } from "@/components/replay-controller";
import { TeamMark } from "@/components/team-mark";
import { WinProbabilityChart } from "@/components/win-probability-chart";
import { games, replayEvents } from "@/lib/demo-data";

export default async function GamePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; const game = games.find(g => g.id === id); if (!game) notFound();
  const hasReplay = game.id === "game-orb-pin-001";
  return <><section className="game-hero"><div className="shell"><div className="breadcrumbs"><Link href="/games">Games</Link><span>/</span><span>{game.away.team.abbreviation} at {game.home.team.abbreviation}</span><DemoBadge compact /></div><div className="scoreboard"><div className="score-team"><TeamMark team={game.away.team} size="lg" /><div><h1>{game.away.team.city}</h1><p>{game.away.team.name} · {game.away.record}</p></div><strong>{game.status === "final" ? game.away.score : "—"}</strong></div><div className="game-status"><span>{game.status}</span><b>{game.venue}</b></div><div className="score-team home"><strong>{game.status === "final" ? game.home.score : "—"}</strong><div><h1>{game.home.team.city}</h1><p>{game.home.team.name} · {game.home.record}</p></div><TeamMark team={game.home.team} size="lg" /></div></div></div></section>{hasReplay ? <section className="game-content shell"><div className="section-label"><h2>Win probability</h2><span>Transparent demo baseline · not validated</span></div><div className="game-chart-panel"><WinProbabilityChart events={replayEvents} /></div><ReplayController events={replayEvents} /><div className="event-log"><div className="section-label"><h2>Key events</h2><span>Ordered by game clock</span></div>{replayEvents.filter(e => e.isKeyEvent).map(event => <div className="event-row" key={event.id}><span>Q{event.period}<b>{event.clock}</b></span><i /><div><strong>{event.description}</strong><small>{event.awayScore}–{event.homeScore} · Home win probability {(event.homeWinProbability * 100).toFixed(0)}%</small></div></div>)}</div></section> : <section className="content-section shell"><div className="empty-state"><div><h2>Replay unavailable.</h2><p>This fixture does not include normalized play-by-play events.</p></div></div></section>}</>;
}

export function generateStaticParams() {
  return games.map((game) => ({ id: game.id }));
}
