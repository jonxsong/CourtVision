"use client";

import Link from "next/link";
import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import { displayNumber, displayPercent } from "@/lib/live-data";
import { useLivePlayers } from "@/lib/use-live-players";
import { TeamMark } from "./team-mark";

export function PlayerDirectory() {
  const { data, players, loading, error } = useLivePlayers();
  const [query, setQuery] = useState("");
  const [position, setPosition] = useState("All");
  const filtered = useMemo(() => players.filter((player) => {
    const matches = `${player.name} ${player.team.city} ${player.team.name} ${player.team.abbreviation}`.toLowerCase().includes(query.toLowerCase());
    return matches && (position === "All" || player.position.includes(position));
  }), [players, query, position]);

  if (loading) return <div className="empty-state"><div><h2>Loading the NBA roster…</h2><p>Retrieving active players and current-season statistics.</p></div></div>;
  if (error) return <div className="empty-state"><div><h2>Player data is temporarily unavailable.</h2><p>{error}</p></div></div>;

  return (
    <>
      <div className="date-rule"><span>{players.length} active NBA players · {data?.season}</span><b>NBA Stats · 15-minute cache</b></div>
      <div className="filter-bar">
        <label className="search-field"><Search size={17} /><span className="sr-only">Search players</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search players or teams…" /></label>
        <label className="select-wrap"><span className="sr-only">Filter by position</span><select className="select" value={position} onChange={(event) => setPosition(event.target.value)}><option>All</option><option>G</option><option>F</option><option>C</option></select></label>
      </div>
      {filtered.length ? <div className="directory-grid">{filtered.map((player) => (
        <Link className="directory-card" href={`/players/live?player=${player.id}`} key={player.id} prefetch={false}>
          <div className="directory-card-top"><span className="player-avatar">{player.initials}</span><TeamMark team={player.team} /></div>
          <h3>{player.name}</h3><p>{player.team.city} {player.team.name} · {player.position} · #{player.number}</p>
          <div className="directory-stats"><span><b>{displayNumber(player.stats.points)}</b><small>PPG</small></span><span><b>{displayPercent(player.stats.trueShootingPct)}</b><small>TS</small></span></div>
        </Link>
      ))}</div> : <div className="empty-state"><div><h2>No players match.</h2><p>Try a different name, team, or position.</p></div></div>}
    </>
  );
}
