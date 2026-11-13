import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { displayNumber, displayPercent } from "@/lib/live-data";
import type { LivePlayer } from "@/lib/types";
import { TeamMark } from "./team-mark";

export function PlayerRow({ player, index }: { player: LivePlayer; index: number }) {
  return (
    <Link className="player-row" href={`/players/live?player=${player.id}`} prefetch={false}>
      <span className="rank">{String(index + 1).padStart(2, "0")}</span>
      <span className="player-avatar">{player.initials}</span>
      <span className="player-name"><strong>{player.name}</strong><small>{player.position} · #{player.number}</small></span>
      <span className="player-team"><TeamMark team={player.team} size="sm" />{player.team.city} {player.team.name}</span>
      <span className="player-stat"><strong>{displayNumber(player.stats.points)}</strong><small>PPG</small></span>
      <span className="player-stat"><strong>{displayPercent(player.stats.trueShootingPct)}</strong><small>TS</small></span>
      <ArrowUpRight size={17} className="row-arrow" />
    </Link>
  );
}
