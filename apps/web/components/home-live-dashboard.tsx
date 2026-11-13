"use client";

import Link from "next/link";
import { ArrowRight, ChevronRight, Radio, ScanSearch, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { fetchLiveData, type LiveGamesPayload } from "@/lib/live-data";
import { useLivePlayers } from "@/lib/use-live-players";
import { GameCard } from "./game-card";
import { PlayerRow } from "./player-row";
import { TeamMark } from "./team-mark";

export function HomeLiveDashboard({ initialGames }: { initialGames: LiveGamesPayload }) {
  const { data: playerData, players, loading: playersLoading } = useLivePlayers();
  const [gamesData, setGamesData] = useState(initialGames);

  useEffect(() => {
    const controller = new AbortController();
    void fetchLiveData<LiveGamesPayload>("/api/games", controller.signal).then(setGamesData).catch(() => undefined);
    return () => controller.abort();
  }, []);

  const featured = gamesData.games.find((game) => game.status === "live") ?? gamesData.games[0];
  const leaders = players.slice(0, 4);
  const first = leaders[0];
  const second = leaders[1];

  return <>
    <section className="hero shell">
      <div className="hero-copy">
        <div className="eyebrow"><span>Basketball, decoded</span><i /></div>
        <h1>See the game<br /><em>beyond</em> the box score.</h1>
        <p>CourtVision turns real NBA player statistics, shot locations, and live scores into comparisons you can inspect and arguments you can test.</p>
        <div className="hero-actions"><Link className="button button-primary button-default" href="/players" prefetch={false}>Explore NBA players <ArrowRight size={17} /></Link><Link className="text-link" href="/games" prefetch={false}><Radio size={15} /> Today&apos;s games</Link></div>
      </div>
      <div className="hero-visual">
        <div className="visual-header"><span>Featured NBA matchup</span><span className="live-data-badge"><i /> Real data</span></div>
        {featured ? <>
          <div className="compare-stage">
            <div className="compare-player left"><TeamMark team={featured.away.team} size="lg" /><h2>{featured.away.team.abbreviation}</h2><p>{featured.away.team.city} {featured.away.team.name}</p></div>
            <div className="versus"><i />{featured.status === "scheduled" ? "VS" : `${featured.away.score}–${featured.home.score}`}<i /></div>
            <div className="compare-player right"><TeamMark team={featured.home.team} size="lg" /><h2>{featured.home.team.abbreviation}</h2><p>{featured.home.team.city} {featured.home.team.name}</p></div>
          </div>
          <Link className="swing-callout" href={`/games/live?game=${featured.id}`}><i>{featured.status}</i><span><b>{featured.headline}</b>Open the live game detail</span></Link>
        </> : <div className="empty-state"><div><h2>No NBA games today.</h2><p>The live service is online and will refresh with the next slate.</p></div></div>}
      </div>
    </section>

    <section className="ticker" aria-label="Product status"><div className="shell ticker-inner"><span><i className="status-dot" /> NBA data connectors online</span><b>{players.length || "All"} active players · real shots · live game slate</b><Link href="/operations" prefetch={false}>View data operations <ChevronRight size={14} /></Link></div></section>

    <section className="section shell">
      <div className="section-heading"><div><span className="kicker">01 · Player intelligence</span><h2>Who is shaping the game?</h2></div><Link href="/players" prefetch={false}>All NBA players <ArrowRight size={16} /></Link></div>
      {playersLoading ? <div className="empty-state"><div><h2>Loading scoring leaders…</h2></div></div> : <div className="player-table"><div className="table-head"><span>Rank</span><span>Player</span><span>Team</span><span>Scoring</span><span>Efficiency</span><span /></div>{leaders.map((player, index) => <PlayerRow player={player} index={index} key={player.id} />)}</div>}
    </section>

    <section className="feature-band"><div className="shell feature-grid">
      <div className="feature-intro"><span className="kicker">02 · Head-to-head analysis</span><h2>Context changes<br />the comparison.</h2><p>Put any two active NBA players side by side across production, efficiency, usage, playmaking, rebounding, and net rating.</p><Link className="button button-secondary button-default" href="/compare" prefetch={false}>Open comparison lab <ArrowRight size={17} /></Link></div>
      {first && second ? <div className="timeline-preview"><div className="timeline-item"><span>01</span><i /><div><small>{first.team.abbreviation} · {playerData?.season}</small><strong>{first.name}</strong><em>{first.stats.points.toFixed(1)} PPG</em></div></div><div className="timeline-item"><span>02</span><i /><div><small>{second.team.abbreviation} · {playerData?.season}</small><strong>{second.name}</strong><em>{second.stats.points.toFixed(1)} PPG</em></div></div></div> : <div className="empty-state"><div><h2>Loading player comparison…</h2></div></div>}
    </div></section>

    <section className="section shell">
      <div className="section-heading"><div><span className="kicker">03 · Game slate</span><h2>Read the night differently.</h2></div><Link href="/games" prefetch={false}>Full NBA schedule <ArrowRight size={16} /></Link></div>
      {gamesData.games.length ? <div className="games-grid">{gamesData.games.slice(0, 3).map((game) => <GameCard game={game} key={game.id} />)}</div> : <div className="empty-state"><div><h2>No games on today&apos;s slate.</h2><p>Check back on the next NBA game day.</p></div></div>}
    </section>

    <section className="insight-cta shell"><div className="orbital-mark"><ScanSearch size={55} /><i /><i /></div><div><span className="kicker">Ask CourtVision</span><h2>Your question.<br />The numbers behind it.</h2><p>Ask about current NBA players, comparisons, shot profiles, league leaders, metrics, and today&apos;s games.</p></div><Link href="/insights" className="ask-prompt" prefetch={false}><Sparkles size={20} /><span><small>Start a conversation</small>Ask CV anything about the NBA</span><ArrowRight size={20} /></Link></section>
  </>;
}
