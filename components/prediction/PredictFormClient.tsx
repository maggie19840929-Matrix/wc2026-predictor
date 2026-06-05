"use client";

import { useEffect, useState } from "react";
import { getUsername } from "@/lib/username";
import { PredictForm } from "./PredictForm";
import type { Outcome } from "@/types";

interface Props {
  matchId: string;
  homeTeam: string;
  awayTeam: string;
}

export function PredictFormClient({ matchId, homeTeam, awayTeam }: Props) {
  const [existing, setExisting] = useState<{
    outcome: Outcome;
    home_score_pred: number | null;
    away_score_pred: number | null;
  } | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const username = getUsername();
    if (!username) { setLoaded(true); return; }

    fetch(`/api/predictions?username=${encodeURIComponent(username)}&match_id=${matchId}`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) setExisting(data[0]);
      })
      .finally(() => setLoaded(true));
  }, [matchId]);

  if (!loaded) return <div className="h-48 bg-gray-900 rounded-2xl animate-pulse" />;

  return (
    <PredictForm
      matchId={matchId}
      homeTeam={homeTeam}
      awayTeam={awayTeam}
      initialOutcome={existing?.outcome}
      initialHome={existing?.home_score_pred ?? undefined}
      initialAway={existing?.away_score_pred ?? undefined}
    />
  );
}
