"use client";

import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { displayNumber, displayPercent } from "@/lib/live-data";
import { useLivePlayers } from "@/lib/use-live-players";

export function InsightTerminal() {
  const { data, players, loading, error } = useLivePlayers();
  const [playerId, setPlayerId] = useState("");
  const [analyzed, setAnalyzed] = useState(false);

  useEffect(() => {
    if (!playerId && players.length) setPlayerId(players[0].id);
  }, [playerId, players]);

  const player = players.find((item) => item.id === playerId);
  if (loading) return <div className="empty-state"><div><h2>Loading NBA research data…</h2></div></div>;
  if (error || !player) return <div className="empty-state"><div><h2>Research data is unavailable.</h2><p>{error ?? "No active NBA player was returned."}</p></div></div>;

  const scoringRead = player.stats.trueShootingPct === null
    ? "Advanced efficiency is unavailable from the upstream response."
    : player.stats.trueShootingPct >= 0.6
      ? "The current scoring profile combines volume with above-threshold true-shooting efficiency."
      : "The current scoring profile should be evaluated alongside role, shot mix, and team context.";

  return <div className="insight-terminal">
    <div className="terminal-head"><span><Sparkles size={16} /> NBA research workspace</span><span className="live-data-badge"><i /> NBA Stats</span></div>
    {!analyzed ? <div className="terminal-empty"><div className="insight-glyph"><Sparkles size={35} /></div><h2>Inspect a real player profile.</h2><p>Select any active NBA player. CourtVision will retrieve current-season facts and keep its descriptive interpretation visibly separate.</p></div> : <article className="answer-card">
      <div className="answer-label"><Sparkles size={15} /> CourtVision analysis · {data?.season}</div>
      <h2>{player.name}: current-season statistical read</h2>
      <p><strong>Retrieved facts:</strong> {player.name} is averaging <strong>{displayNumber(player.stats.points)} points</strong>, <strong>{displayNumber(player.stats.rebounds)} rebounds</strong>, and <strong>{displayNumber(player.stats.assists)} assists</strong> through {player.stats.gamesPlayed} games.</p>
      <div className="fact-grid"><div><small>Points per game</small><b>{displayNumber(player.stats.points)}</b><span>{player.stats.gamesPlayed}-game sample</span></div><div><small>True shooting</small><b>{displayPercent(player.stats.trueShootingPct)}</b><span>NBA Stats advanced</span></div><div><small>Net rating</small><b>{displayNumber(player.stats.netRating)}</b><span>Per 100 possessions</span></div></div>
      <div className="interpretation"><small>Interpretation</small><p>{scoringRead} This is descriptive, not a causal claim or player ranking.</p></div>
      <div className="limitations"><strong>Limitations</strong><span>Current regular season · Team and role context not adjusted · Missing values remain unavailable</span></div>
      <Link className="text-link" href={`/players/live?player=${player.id}`}>Open complete player profile <ArrowRight size={15} /></Link>
    </article>}
    <form onSubmit={(event) => { event.preventDefault(); setAnalyzed(true); }} className="question-box"><label className="sr-only" htmlFor="insight-player">NBA player</label><select id="insight-player" value={playerId} onChange={(event) => { setPlayerId(event.target.value); setAnalyzed(false); }}>{players.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.team.abbreviation}</option>)}</select><button aria-label="Analyze player"><ArrowRight size={18} /></button><small>Real current-season retrieval · no generated statistics</small></form>
  </div>;
}
