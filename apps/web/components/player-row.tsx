import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { Player } from "@/lib/types";
import { TeamMark } from "./team-mark";

export function PlayerRow({ player, index }: { player: Player; index: number }) {
  return (
    <Link className="player-row" href={`/players/${player.id}`} prefetch={false}>
      <span className="rank">{String(index + 1).padStart(2, "0")}</span>
      <span className="player-avatar">{player.initials}</span>
      <span className="player-name"><strong>{player.name}</strong><small>{player.position} · #{player.number}</small></span>
      <span className="player-team"><TeamMark team={player.team} size="sm" />{player.team.city} {player.team.name}</span>
      <span className="player-stat"><strong>{(27.4 - index * 1.7).toFixed(1)}</strong><small>PPG</small></span>
      <span className="player-stat"><strong>{(64.2 - index * 1.3).toFixed(1)}%</strong><small>TS</small></span>
      <ArrowUpRight size={17} className="row-arrow" />
    </Link>
  );
}
