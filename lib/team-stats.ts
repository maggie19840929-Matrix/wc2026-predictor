const BASE_URL = "https://api.football-data.org/v4";

async function apiFetch(path: string) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "X-Auth-Token": process.env.FOOTBALL_DATA_API_KEY! },
    next: { revalidate: 3600 }, // 1小时缓存
  });
  if (!res.ok) throw new Error(`football-data API error: ${res.status} ${path}`);
  return res.json();
}

export interface RecentForm {
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  formString: string; // 如 "WWDLW"
  estimatedAHWinRate: number; // 估算赢盘率 0-1（基于进球差加权）
}

export interface H2HRecord {
  played: number;
  homeWins: number; // 本场主队赢的次数
  draws: number;
  awayWins: number; // 本场客队赢的次数
  recentMatches: {
    date: string;
    homeTeam: string;
    awayTeam: string;
    homeScore: number;
    awayScore: number;
  }[];
}

/** 获取球队近期5场状态 */
export async function getTeamRecentForm(teamId: number): Promise<RecentForm> {
  try {
    // 拉取近10场用于估算赢盘率，取最近5场用于近期状态显示
    const data = await apiFetch(
      `/teams/${teamId}/matches?status=FINISHED&limit=10`
    );

    const all10 = (data.matches ?? []).slice(0, 10);
    const matches = all10.slice(0, 5); // 近5场用于状态显示
    let wins = 0, draws = 0, losses = 0, goalsFor = 0, goalsAgainst = 0;
    const formChars: string[] = [];

    for (const m of matches) {
      const isHome = m.homeTeam.id === teamId;
      const teamScore = isHome ? m.score.fullTime.home : m.score.fullTime.away;
      const oppScore = isHome ? m.score.fullTime.away : m.score.fullTime.home;
      if (teamScore === null || oppScore === null) continue;
      goalsFor += teamScore;
      goalsAgainst += oppScore;
      if (teamScore > oppScore) { wins++; formChars.push("W"); }
      else if (teamScore === oppScore) { draws++; formChars.push("D"); }
      else { losses++; formChars.push("L"); }
    }

    // 估算赢盘率（近10场，基于进球差加权）
    // 赢2+球=1.0，赢1球=0.75，平=0.5，负=0
    let ahScore = 0, ahPlayed = 0;
    for (const m of all10) {
      const isHome = m.homeTeam.id === teamId;
      const teamScore = isHome ? m.score.fullTime.home : m.score.fullTime.away;
      const oppScore = isHome ? m.score.fullTime.away : m.score.fullTime.home;
      if (teamScore === null || oppScore === null) continue;
      const diff = teamScore - oppScore;
      if (diff >= 2) ahScore += 1.0;
      else if (diff === 1) ahScore += 0.75;
      else if (diff === 0) ahScore += 0.5;
      else ahScore += 0.0;
      ahPlayed++;
    }
    const estimatedAHWinRate = ahPlayed > 0 ? ahScore / ahPlayed : 0.5;

    return {
      played: matches.length,
      wins, draws, losses, goalsFor, goalsAgainst,
      formString: formChars.join(""),
      estimatedAHWinRate,
    };
  } catch {
    return { played: 0, wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0, formString: "", estimatedAHWinRate: 0.5 };
  }
}

/** 获取两队历史交锋（近10场） */
export async function getH2H(matchApiId: number, homeTeamId: number, awayTeamId: number): Promise<H2HRecord> {
  try {
    const data = await apiFetch(`/matches/${matchApiId}/head2head?limit=10`);
    const matches = data.matches ?? [];

    let homeWins = 0, draws = 0, awayWins = 0;
    const recent: H2HRecord["recentMatches"] = [];

    for (const m of matches) {
      if (m.score.fullTime.home === null) continue;

      const homeScore = m.score.fullTime.home;
      const awayScore = m.score.fullTime.away;

      // 统一换算成"本场主队/客队"的角度
      const mHomeIsOurHome = m.homeTeam.id === homeTeamId;
      if (mHomeIsOurHome) {
        if (homeScore > awayScore) homeWins++;
        else if (homeScore === awayScore) draws++;
        else awayWins++;
      } else {
        if (awayScore > homeScore) homeWins++;
        else if (homeScore === awayScore) draws++;
        else homeWins === 0 ? awayWins++ : awayWins++;
      }

      recent.push({
        date: m.utcDate?.slice(0, 10) ?? "",
        homeTeam: m.homeTeam.shortName ?? m.homeTeam.name,
        awayTeam: m.awayTeam.shortName ?? m.awayTeam.name,
        homeScore,
        awayScore,
      });
    }

    return { played: matches.length, homeWins, draws, awayWins, recentMatches: recent.slice(0, 5) };
  } catch {
    return { played: 0, homeWins: 0, draws: 0, awayWins: 0, recentMatches: [] };
  }
}

/** 获取世界杯积分榜 */
export async function getStandings() {
  try {
    const data = await apiFetch(`/competitions/2000/standings`);
    return data.standings ?? [];
  } catch {
    return [];
  }
}
