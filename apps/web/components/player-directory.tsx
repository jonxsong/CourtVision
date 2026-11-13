"use client";

import Link from "next/link";
import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import type { Player } from "@/lib/types";
import { TeamMark } from "./team-mark";

export function PlayerDirectory({ players }: { players: Player[] }) {
  const [query, setQuery] = useState("");
  const [position, setPosition] = useState("All");
  const filtered = useMemo(() => players.filter((player) => {
    const matches = `${player.name} ${player.team.city} ${player.team.name}`.toLowerCase().includes(query.toLowerCase());
    return matches && (position === "All" || player.position === position);
  }), [players, query, position]);
  return (
    <>
      <div className="filter-bar">
        <label className="search-field"><Search size={17} /><span className="sr-only">Search players</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search players or teams…" /></label>
        <label className="select-wrap"><span className="sr-only">Filter by position</span><select className="select" value={position} onChange={(event) => setPosition(event.target.value)}><option>All</option><option>G</option><option>F</option><option>C</option></select></label>
      </div>
      {filtered.length ? <div className="directory-grid">{filtered.map((player, index) => (
        <Link className="directory-card" href={`/players/${player.id}`} key={player.id}>
          <div className="directory-card-top"><span className="player-avatar">{player.initials}</span><TeamMark team={player.team} /></div>
          <h3>{player.name}</h3><p>{player.team.city} {player.team.name} · {player.position} · #{player.number}</p>
          <div className="directory-stats"><span><b>{(27.4 - index * 1.7).toFixed(1)}</b><small>PPG</small></span><span><b>{(64.2 - index * 1.3).toFixed(1)}%</b><small>TS</small></span></div>
        </Link>
      ))}</div> : <div className="empty-state"><div><h2>No players match.</h2><p>Try a different name, team, or position.</p></div></div>}
    </>
  );
}
