"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { displayNumber, displayPercent } from "@/lib/live-data";
import { useLivePlayers } from "@/lib/use-live-players";

export function LivePlayerProfile() {
  const playerId = useSearchParams().get("player");
  const { players, loading, error } = useLivePlayers();
  const player = players.find((item) => item.id === playerId);

  if (loading) return <section className="content-section shell"><div className="empty-state"><div><h2>Loading player profile…</h2><p>Retrieving current NBA season statistics.</p></div></div></section>;
  if (error || !player) return <section className="content-section shell"><div className="empty-state"><div><h2>Player profile unavailable.</h2><p>{error ?? "This player was not found on the active NBA roster."}</p><Link href="/players">Browse all players</Link></div></div></section>;

  const metrics = [
    ["Points", displayNumber(player.stats.points), "Per game"],
    ["Rebounds", displayNumber(player.stats.rebounds), "Per game"],
    ["Assists", displayNumber(player.stats.assists), "Per game"],
    ["True shooting", displayPercent(player.stats.trueShootingPct), "Scoring efficiency"],
    ["Usage", displayPercent(player.stats.usagePct), "Possessions used"],
    ["Net rating", displayNumber(player.stats.netRating), "Per 100 possessions"],
    ["Steals", displayNumber(player.stats.steals), "Per game"],
    ["Blocks", displayNumber(player.stats.blocks), "Per game"],
  ];

  return <>
    <section className="profile-hero"><div className="shell">
      <div className="breadcrumbs"><Link href="/players">Players</Link><span>/</span><span>{player.name}</span><span className="live-data-badge"><i /> NBA Stats</span></div>
      <div className="profile-main"><div className="profile-avatar">{player.initials}</div><div className="profile-title"><h1>{player.name}</h1><p>{player.team.city} {player.team.name} · {player.position} · #{player.number}</p></div><div className="profile-meta"><div><small>Height</small><strong>{player.bio.height}</strong></div><div><small>Weight</small><strong>{player.bio.weight}</strong></div><div><small>Games</small><strong>{player.stats.gamesPlayed}</strong></div></div></div>
      <div className="profile-tabs"><span>2026–27 overview</span><span>{player.bio.country}</span><span>{player.bio.college}</span></div>
    </div></section>
    <section className="content-section shell">
      <div className="metric-grid">{metrics.map(([label, value, note]) => <div className="metric-cell" key={label}><div><span>{label}</span><em>{note}</em></div><strong>{value}</strong></div>)}</div>
      <div className="profile-columns"><article className="profile-card"><span className="kicker">Shooting</span><h2>Current efficiency</h2><div className="fact-grid"><div><small>Field goal</small><b>{displayPercent(player.stats.fieldGoalPct)}</b></div><div><small>Three point</small><b>{displayPercent(player.stats.threePointPct)}</b></div><div><small>Free throw</small><b>{displayPercent(player.stats.freeThrowPct)}</b></div></div><Link className="text-link" href={`/shots?player=${player.id}`}>Open real shot chart <ArrowRight size={15} /></Link></article><article className="profile-card"><span className="kicker">Player information</span><h2>Roster record</h2><p>{player.bio.draft}</p><p>Season: {player.season} · Minutes: {displayNumber(player.stats.minutes)} per game · Plus/minus: {displayNumber(player.stats.plusMinus)}</p></article></div>
    </section>
  </>;
}
