const BASE_URL = "https://api.football-data.org/v4";
const WC_ID = process.env.NEXT_PUBLIC_WC_COMPETITION_ID || "2000";

async function apiFetch(path: string) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "X-Auth-Token": process.env.FOOTBALL_DATA_API_KEY! },
    next: { revalidate: 60 },
  });
  if (!res.ok) throw new Error(`football-data API error: ${res.status}`);
  return res.json();
}

export async function getMatches() {
  return apiFetch(`/competitions/${WC_ID}/matches`);
}

export async function getMatch(id: number) {
  return apiFetch(`/matches/${id}`);
}

export async function getStandings() {
  return apiFetch(`/competitions/${WC_ID}/standings`);
}

export async function getTeam(id: number) {
  return apiFetch(`/teams/${id}`);
}

/** Convert API match to our DB-friendly format */
export function normalizeMatch(m: ApiMatch) {
  return {
    api_id: m.id,
    utc_date: m.utcDate,
    status: m.status,
    stage: m.stage,
    group: m.group ?? null,
    home_team_id: m.homeTeam.id,
    home_team_name: m.homeTeam.name,
    home_team_short: m.homeTeam.shortName,
    home_team_crest: m.homeTeam.crest,
    away_team_id: m.awayTeam.id,
    away_team_name: m.awayTeam.name,
    away_team_short: m.awayTeam.shortName,
    away_team_crest: m.awayTeam.crest,
    home_score: m.score.fullTime.home,
    away_score: m.score.fullTime.away,
  };
}

interface ApiMatch {
  id: number;
  utcDate: string;
  status: string;
  stage: string;
  group?: string;
  homeTeam: { id: number; name: string; shortName: string; crest: string };
  awayTeam: { id: number; name: string; shortName: string; crest: string };
  score: { fullTime: { home: number | null; away: number | null } };
}
