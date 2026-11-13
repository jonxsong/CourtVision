"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { fetchLiveData, type ShotsPayload } from "@/lib/live-data";
import type { Shot } from "@/lib/types";
import { useLivePlayers } from "@/lib/use-live-players";
import { Court } from "./court";

export function ShotExplorer() {
  const requestedPlayer = useSearchParams().get("player");
  const { data: playerData, players, loading: playersLoading, error: playersError } = useLivePlayers();
  const [playerId, setPlayerId] = useState("");
  const [result, setResult] = useState<"all" | "made" | "missed">("all");
  const [shots, setShots] = useState<Shot[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!players.length || playerId) return;
    const requested = players.find((player) => player.id === requestedPlayer);
    setPlayerId(requested?.id ?? players[0].id);
  }, [players, playerId, requestedPlayer]);

  useEffect(() => {
    if (!playerId || !playerData?.season) return;
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    setShots([]);
    void fetchLiveData<ShotsPayload>(`/api/shots?player_id=${encodeURIComponent(playerId)}&season=${encodeURIComponent(playerData.season)}`, controller.signal)
      .then((payload) => setShots(payload.shots))
      .catch((reason: unknown) => {
        if (!(reason instanceof DOMException && reason.name === "AbortError")) setError(reason instanceof Error ? reason.message : "Shot data is unavailable");
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [playerId, playerData?.season]);

  const player = players.find((item) => item.id === playerId);
  const filtered = useMemo(() => shots.filter((shot) => result === "all" || shot.made === (result === "made")), [shots, result]);
  const attempts = filtered.length;
  const makes = filtered.filter((shot) => shot.made).length;
  const zones = [
    { label: "At rim", data: filtered.filter((shot) => shot.zone === "Rim") },
    { label: "Paint", data: filtered.filter((shot) => shot.zone === "Paint") },
    { label: "Mid-range", data: filtered.filter((shot) => shot.zone === "Mid-range") },
    { label: "Three", data: filtered.filter((shot) => shot.zone === "Three") },
  ];

  if (playersLoading) return <div className="empty-state"><div><h2>Loading NBA players…</h2></div></div>;
  if (playersError) return <div className="empty-state"><div><h2>Player data is unavailable.</h2><p>{playersError}</p></div></div>;

  return (
    <div className="shot-layout">
      <aside className="shot-controls">
        <span className="live-data-badge"><i /> NBA Stats</span>
        <label><small>Player</small><select value={playerId} onChange={(event) => setPlayerId(event.target.value)}>{players.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.team.abbreviation}</option>)}</select></label>
        <label><small>Season</small><select value={playerData?.season ?? ""} disabled><option>{playerData?.season ?? "Loading"}</option></select></label>
        <fieldset><legend>Result</legend><div className="segmented">{(["all", "made", "missed"] as const).map((value) => <button type="button" className={result === value ? "active" : ""} onClick={() => setResult(value)} key={value}>{value}</button>)}</div></fieldset>
        <div className="shot-summary"><div><strong>{attempts ? (makes / attempts * 100).toFixed(1) : "—"}%</strong><span>FG</span></div><div><strong>{attempts}</strong><span>Attempts</span></div></div>
        <div className="legend"><span><i className="made" />Made</span><span><i className="missed" />Missed</span></div>
      </aside>
      <div className="court-panel">
        {loading ? <div className="empty-state"><div><h2>Loading {player?.name ?? "player"} shots…</h2></div></div> : error ? <div className="empty-state"><div><h2>Shot data is temporarily unavailable.</h2><p>{error}</p></div></div> : <Court shots={filtered} />}
        <p>{player?.name ?? "Player"} · real regular-season field-goal attempts · coordinates converted from NBA decifeet to court feet.</p>
      </div>
      <aside className="zone-breakdown">
        <span className="kicker">Efficiency by area</span><h2>Shot profile</h2>
        {zones.map((zone) => {
          const made = zone.data.filter((shot) => shot.made).length;
          const pct = zone.data.length ? made / zone.data.length * 100 : 0;
          return <div className="zone-stat" key={zone.label}><div><span>{zone.label}</span><b>{zone.data.length ? `${pct.toFixed(1)}%` : "—"}</b></div><i><em style={{ width: `${pct}%` }} /></i><small>{made} / {zone.data.length}</small></div>;
        })}
      </aside>
    </div>
  );
}
