"use client";

import { useEffect, useState } from "react";
import { getUsername } from "@/lib/username";
import { MatchCard } from "./MatchCard";
import type { Match } from "@/types";

interface Props {
  matches: Match[];
}

export function MatchListClient({ matches }: Props) {
  const [userPreds, setUserPreds] = useState<Record<string, string>>({});

  useEffect(() => {
    const username = getUsername();
    if (!username) return;

    fetch(`/api/predictions?username=${encodeURIComponent(username)}`)
      .then((r) => r.json())
      .then((data: { match_id: string; outcome: string }[]) => {
        setUserPreds(Object.fromEntries(data.map((p) => [p.match_id, p.outcome])));
      })
      .catch(() => {});
  }, []);

  // Group by date
  const byDate: Record<string, Match[]> = {};
  for (const m of matches) {
    const key = new Date(m.utc_date).toLocaleDateString("zh-CN", {
      month: "long",
      day: "numeric",
      weekday: "short",
    });
    if (!byDate[key]) byDate[key] = [];
    byDate[key].push(m);
  }

  return (
    <div className="space-y-8">
      {Object.entries(byDate).map(([date, dayMatches]) => (
        <section key={date}>
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">{date}</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {dayMatches.map((m) => (
              <MatchCard key={m.id} match={m} userOutcome={userPreds[m.id]} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
