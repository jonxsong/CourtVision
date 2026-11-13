"use client";

import { Pause, Play, RotateCcw, StepForward } from "lucide-react";
import { useEffect, useState } from "react";
import type { GameEvent } from "@/lib/types";
import { Button } from "./ui/button";

export function ReplayController({ events }: { events: GameEvent[] }) {
  const [index, setIndex] = useState(events.length - 1);
  const [playing, setPlaying] = useState(false);
  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => setIndex(current => {
      if (current >= events.length - 1) { setPlaying(false); return current; }
      return current + 1;
    }), 850);
    return () => window.clearInterval(timer);
  }, [playing, events.length]);
  const current = events[index];
  return (
    <div className="replay-control">
      <div className="replay-score"><span>PIN <b>{current.awayScore}</b></span><em>Q{current.period} · {current.clock}</em><span><b>{current.homeScore}</b> ORB</span></div>
      <input aria-label="Replay progress" type="range" min="0" max={events.length - 1} value={index} onChange={e => { setPlaying(false); setIndex(Number(e.target.value)); }} />
      <div className="replay-actions"><Button variant="ghost" size="icon" onClick={() => { setPlaying(false); setIndex(0); }} aria-label="Restart"><RotateCcw size={16} /></Button><Button size="icon" onClick={() => { if (index >= events.length - 1) setIndex(0); setPlaying(!playing); }} aria-label={playing ? "Pause replay" : "Play replay"}>{playing ? <Pause size={17} /> : <Play size={17} />}</Button><Button variant="ghost" size="icon" onClick={() => setIndex(Math.min(events.length - 1, index + 1))} aria-label="Next event"><StepForward size={16} /></Button></div>
      <div className="current-event"><small>Current event</small><strong>{current.description}</strong><span>Home win probability {(current.homeWinProbability * 100).toFixed(0)}%</span></div>
    </div>
  );
}
