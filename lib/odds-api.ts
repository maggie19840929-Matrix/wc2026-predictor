const BASE = "https://api.the-odds-api.com/v4";
const KEY = process.env.ODDS_API_KEY!;

export interface BookmakerOdds {
  key: string;
  title: string;
  home: number;
  draw: number;
  away: number;
}

export interface MatchOdds {
  home_team: string;
  away_team: string;
  commence_time: string;
  bookmakers: BookmakerOdds[];
  best_home: number;
  best_draw: number;
  best_away: number;
  best_home_book: string;
  best_draw_book: string;
  best_away_book: string;
}

// 拉取世界杯所有比赛赔率
export async function fetchWCOdds(): Promise<MatchOdds[]> {
  const url = `${BASE}/sports/soccer_fifa_world_cup/odds/?apiKey=${KEY}&regions=eu&markets=h2h&oddsFormat=decimal`;
  const res = await fetch(url, { next: { revalidate: 300 } });
  if (!res.ok) throw new Error(`odds-api error: ${res.status}`);
  const data = await res.json();

  return data.map((event: OddsEvent) => {
    const books: BookmakerOdds[] = [];

    for (const bm of event.bookmakers) {
      const h2h = bm.markets.find((m: { key: string }) => m.key === "h2h");
      if (!h2h) continue;
      const homeOdds = h2h.outcomes.find((o: { name: string }) => o.name === event.home_team)?.price;
      const awayOdds = h2h.outcomes.find((o: { name: string }) => o.name === event.away_team)?.price;
      const drawOdds = h2h.outcomes.find((o: { name: string }) => o.name === "Draw")?.price;
      if (!homeOdds || !awayOdds || !drawOdds) continue;
      books.push({ key: bm.key, title: bm.title, home: homeOdds, draw: drawOdds, away: awayOdds });
    }

    const best_home = Math.max(...books.map((b) => b.home));
    const best_draw = Math.max(...books.map((b) => b.draw));
    const best_away = Math.max(...books.map((b) => b.away));

    return {
      home_team: event.home_team,
      away_team: event.away_team,
      commence_time: event.commence_time,
      bookmakers: books,
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
      outcomes: { name: string; price: number }[];
    }[];
  }[];
}
