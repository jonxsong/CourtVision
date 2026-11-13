import Link from "next/link";
import { ArrowRight, ChevronRight, Radio, ScanSearch, Sparkles } from "lucide-react";
import { DemoBadge } from "@/components/demo-badge";
import { GameCard } from "@/components/game-card";
import { PlayerRow } from "@/components/player-row";
import { WinProbabilityChart } from "@/components/win-probability-chart";
import { games, players, replayEvents } from "@/lib/demo-data";

export default function HomePage() {
  return (
    <>
      <section className="hero shell">
        <div className="hero-copy">
          <div className="eyebrow"><span>Basketball, decoded</span><i /></div>
          <h1>See the game<br /><em>beyond</em> the box score.</h1>
          <p>CourtVision turns every possession, shot, and shift in momentum into a story you can see—and an argument you can test.</p>
          <div className="hero-actions"><Link className="button button-primary button-default" href="/players" prefetch={false}>Explore players <ArrowRight size={17} /></Link><Link className="text-link" href="/games/game-orb-pin-001" prefetch={false}><Radio size={15} /> Replay a game</Link></div>
        </div>
        <div className="hero-visual">
          <div className="visual-header"><span>Featured game · Win probability</span><DemoBadge compact /></div>
          <WinProbabilityChart events={replayEvents} />
          <div className="hero-score">
            <div><span>PIN</span><strong>114</strong></div><div className="final-pill">FINAL</div><div><strong>118</strong><span>ORB</span></div>
          </div>
          <div className="swing-callout"><i>+32.0%</i><span><b>Biggest swing</b>Orbit pressure forces three turnovers · Q3 1:12</span></div>
        </div>
      </section>

      <section className="ticker" aria-label="Product status"><div className="shell ticker-inner"><span><i className="status-dot" /> Free live connector verified</span><b>Real NBA score snapshot + labeled replay fixtures</b><Link href="/operations" prefetch={false}>View data operations <ChevronRight size={14} /></Link></div></section>

      <section className="section shell">
        <div className="section-heading"><div><span className="kicker">01 · Player intelligence</span><h2>Who is shaping the game?</h2></div><Link href="/players" prefetch={false}>All players <ArrowRight size={16} /></Link></div>
        <div className="player-table"><div className="table-head"><span>Rank</span><span>Player</span><span>Team</span><span>Scoring</span><span>Efficiency</span><span /></div>{players.slice(0, 4).map((player, index) => <PlayerRow player={player} index={index} key={player.id} />)}</div>
      </section>

      <section className="feature-band">
        <div className="shell feature-grid">
          <div className="feature-intro"><span className="kicker">02 · Possession by possession</span><h2>Momentum has<br />a shape.</h2><p>Replay the decisions that changed a game. Every probability shift links back to the event and context behind it.</p><Link className="button button-secondary button-default" href="/games/game-orb-pin-001" prefetch={false}>Open game intelligence <ArrowRight size={17} /></Link></div>
          <div className="timeline-preview">
            {replayEvents.filter((e) => e.isKeyEvent).map((event, i) => <div className="timeline-item" key={event.id}><span>0{i + 1}</span><i /><div><small>Q{event.period} · {event.clock}</small><strong>{event.description}</strong><em>{event.homeWinProbability > .5 ? "+" : ""}{Math.round((event.homeWinProbability - .5) * 100)}% ORB</em></div></div>)}
          </div>
        </div>
      </section>

      <section className="section shell">
        <div className="section-heading"><div><span className="kicker">03 · Game slate</span><h2>Read the night differently.</h2></div><Link href="/games" prefetch={false}>Full schedule <ArrowRight size={16} /></Link></div>
        <div className="games-grid">{games.map((game) => <GameCard game={game} key={game.id} />)}</div>
      </section>

      <section className="insight-cta shell">
        <div className="orbital-mark"><ScanSearch size={55} /><i /><i /></div>
        <div><span className="kicker">Ask CourtVision</span><h2>Your question.<br />The numbers behind it.</h2><p>A grounded research interface that separates retrieved facts from basketball interpretation.</p></div>
        <Link href="/insights" className="ask-prompt" prefetch={false}><Sparkles size={20} /><span><small>Try asking</small>What drove the biggest swing tonight?</span><ArrowRight size={20} /></Link>
      </section>
    </>
  );
}
