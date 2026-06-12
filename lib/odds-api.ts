const BASE = "https://api.the-odds-api.com/v4";
const KEY = process.env.ODDS_API_KEY!;

export interface BookmakerOdds {
  key: string;
  title: string;
  home: number;
  draw: number;
  away: number;
}

/** 单个庄家的大小球赔率（某条盘口线） */
export interface TotalsOdds {
  key: string;
  title: string;
  line: number;   // 盘口线，如 2.5
  over: number;   // 大球赔率
  under: number;  // 小球赔率
}

export interface MatchOdds {
  home_team: string;
  away_team: string;
  commence_time: string;
  bookmakers: BookmakerOdds[];
  totals: TotalsOdds[];
  best_home: number;
  best_draw: number;
  best_away: number;
  best_home_book: string;
  best_draw_book: string;
  best_away_book: string;
}

// 拉取世界杯所有比赛赔率（含 1X2 与 大小球）
export async function fetchWCOdds(): Promise<MatchOdds[]> {
  const url = `${BASE}/sports/soccer_fifa_world_cup/odds/?apiKey=${KEY}&regions=eu&markets=h2h,totals&oddsFormat=decimal`;
  const res = await fetch(url, { next: { revalidate: 300 } });
  if (!res.ok) throw new Error(`odds-api error: ${res.status}`);
  const data = await res.json();

  return data.map((event: OddsEvent) => {
    const books: BookmakerOdds[] = [];
    const totals: TotalsOdds[] = [];

    for (const bm of event.bookmakers) {
      // 1X2
      const h2h = bm.markets.find((m) => m.key === "h2h");
      if (h2h) {
        const homeOdds = h2h.outcomes.find((o) => o.name === event.home_team)?.price;
        const awayOdds = h2h.outcomes.find((o) => o.name === event.away_team)?.price;
        const drawOdds = h2h.outcomes.find((o) => o.name === "Draw")?.price;
        if (homeOdds && awayOdds && drawOdds) {
          books.push({ key: bm.key, title: bm.title, home: homeOdds, draw: drawOdds, away: awayOdds });
        }
      }
      // 大小球
      const tot = bm.markets.find((m) => m.key === "totals");
      if (tot) {
        const over = tot.outcomes.find((o) => o.name === "Over");
        const under = tot.outcomes.find((o) => o.name === "Under");
        if (over && under && over.point != null) {
          totals.push({ key: bm.key, title: bm.title, line: over.point, over: over.price, under: under.price });
        }
      }
    }

    const best_home = books.length ? Math.max(...books.map((b) => b.home)) : 0;
    const best_draw = books.length ? Math.max(...books.map((b) => b.draw)) : 0;
    const best_away = books.length ? Math.max(...books.map((b) => b.away)) : 0;

    return {
      home_team: event.home_team,
      away_team: event.away_team,
      commence_time: event.commence_time,
      bookmakers: books,
      totals,
      best_home,
      best_draw,
      best_away,
      best_home_book: books.find((b) => b.home === best_home)?.title ?? "",
      best_draw_book: books.find((b) => b.draw === best_draw)?.title ?? "",
      best_away_book: books.find((b) => b.away === best_away)?.title ?? "",
    };
  });
}

interface OddsEvent {
  id: string;
  home_team: string;
  away_team: string;
  commence_time: string;
  bookmakers: {
    key: string;
    title: string;
    markets: {
      key: string;
      outcomes: { name: string; price: number; point?: number }[];
    }[];
  }[];
}
