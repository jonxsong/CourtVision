"use client";

import { useEffect, useState } from "react";
import { fetchLiveData, type PlayersPayload } from "@/lib/live-data";

let snapshot: PlayersPayload | null = null;
let request: Promise<PlayersPayload> | null = null;

function loadPlayers() {
  if (snapshot) return Promise.resolve(snapshot);
  if (!request) {
    request = fetchLiveData<PlayersPayload>("/api/players")
      .then((payload) => {
        snapshot = payload;
        return payload;
      })
      .finally(() => { request = null; });
  }
  return request;
}

export function useLivePlayers() {
  const [data, setData] = useState<PlayersPayload | null>(snapshot);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void loadPlayers().then((payload) => {
      if (active) setData(payload);
    }).catch((reason: unknown) => {
      if (active) setError(reason instanceof Error ? reason.message : "Player data is unavailable");
    });
    return () => { active = false; };
  }, []);

  return { data, players: data?.players ?? [], loading: !data && !error, error };
}
