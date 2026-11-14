"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { fetchShotsData } from "@/lib/live-data";
import type { Shot } from "@/lib/types";
import { useLivePlayers } from "@/lib/use-live-players";
import { Court } from "./court";

export function ShotExplorer() {
  const requestedPlayer = useSearchParams().get("player");
  const { data: playerData, players, loading: playersLoading, error: playersError } = useLivePlayers();
  const [playerId, setPlayerId] = useState("");
  const [result, setResult] = useState<"all" | "made" | "missed">("all");
  const [shotState, setShotState] = useState<{ key: string; shots: Shot[]; error: string | null }>({ key: "", shots: [], error: null });
  const requested = players.find((player) => player.id === requestedPlayer);
  const effectivePlayerId = playerId || requested?.id || players[0]?.id || "";
  const requestKey = effectivePlayerId && playerData?.season ? `${effectivePlayerId}:${playerData.season}` : "";

  useEffect(() => {
    if (!effectivePlayerId || !playerData?.season || !requestKey) return;
    const controller = new AbortController();
    void fetchShotsData(effectivePlayerId, playerData.season, controller.signal)
      .then((payload) => setShotState({ key: requestKey, shots: payload.shots, error: null }))
      .catch((reason: unknown) => {
        if (!(reason instanceof DOMException && reason.name === "AbortError")) setShotState({ key: requestKey, shots: [], error: reason instanceof Error ? reason.message : "Shot data is unavailable" });
      });
    return () => controller.abort();
  }, [effectivePlayerId, playerData?.season, requestKey]);

  const loading = Boolean(requestKey && shotState.key !== requestKey);
  const error = shotState.key === requestKey ? shotState.error : null;
  const player = players.find((item) => item.id === effectivePlayerId);
  const filtered = useMemo(() => {
    const shots = shotState.key === requestKey ? shotState.shots : [];
    return shots.filter((shot) => result === "all" || shot.made === (result === "made"));
  }, [shotState, requestKey, result]);
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
        <label><small>Player</small><select value={effectivePlayerId} onChange={(event) => setPlayerId(event.target.value)}>{players.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.team.abbreviation}</option>)}</select></label>
        <label><small>Season</small><select value={playerData?.season ?? ""} disabled><option>{playerData?.season ?? "Loading"}</option></select></label>
        <fieldset><legend>Result</legend><div className="segmented">{(["all", "made", "missed"] as const).map((value) => <button type="button" className={result === value ? "active" : ""} onClick={() => setResult(value)} key={value}>{value}</button>)}</div></fieldset>
        <div className="shot-summary"><div><strong>{attempts ? `${(makes / attempts * 100).toFixed(1)}%` : "—"}</strong><span>FG</span></div><div><strong>{attempts}</strong><span>Attempts</span></div></div>
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
