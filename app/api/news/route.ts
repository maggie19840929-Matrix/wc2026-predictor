import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

/** 从 Google News RSS 抓取新闻标题 */
async function fetchNewsHeadlines(homeTeam: string, awayTeam: string): Promise<string[]> {
  const queries = [
    `${homeTeam} ${awayTeam} World Cup 2026`,
    `${homeTeam} FIFA World Cup`,
    `${awayTeam} FIFA World Cup`,
  ];

  const headlines: string[] = [];

  for (const q of queries) {
    try {
      const url = `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=en&gl=US&ceid=US:en`;
      const res = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept": "application/rss+xml, application/xml, text/xml, */*",
        },
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) continue;
      const xml = await res.text();

      // 兼容两种格式：CDATA 和普通文本
      const cdataMatches = [...xml.matchAll(/<title><!\[CDATA\[(.*?)\]\]><\/title>/g)];
      const plainMatches = [...xml.matchAll(/<title>(?!\s*<!\[CDATA\[)(.*?)<\/title>/g)];
      const allMatches = cdataMatches.length > 0 ? cdataMatches : plainMatches;

      // 跳过第一个（频道标题）
      for (const m of allMatches.slice(1, 6)) {
        const title = m[1].replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").trim();
        if (title && title.length > 10 && !headlines.includes(title)) {
          headlines.push(title);
        }
      }
    } catch {
      // 单个查询失败不影响其他
    }
  }

  return headlines.slice(0, 12);
}

/** 调用 DeepSeek 分析新闻 */
async function analyzeWithDeepSeek(
  homeTeam: string,
  awayTeam: string,
  headlines: string[]
): Promise<{ intel: string; homeImpact: number; awayImpact: number }> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) throw new Error("DEEPSEEK_API_KEY not configured");

  const prompt = `你是一个专业的世界杯足球分析师。以下是关于 ${homeTeam} vs ${awayTeam} 的最新新闻标题：

${headlines.map((h, i) => `${i + 1}. ${h}`).join("\n")}

请根据这些新闻，用简洁的中文（100字以内）总结：
1. 两队的关键情报（伤病、停赛、状态、战术等）
2. 综合判断哪方受到正面/负面影响

请严格按照以下JSON格式回复（不要有其他文字）：
{
  "intel": "情报摘要文字",
  "homeImpact": 0,
  "awayImpact": 0
}

其中 homeImpact 和 awayImpact 取值：-2（明显利空）、-1（轻微利空）、0（中性）、1（轻微利好）、2（明显利好）`;

  const res = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "deepseek-chat",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
      max_tokens: 300,
    }),
    signal: AbortSignal.timeout(15000),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`DeepSeek API error: ${res.status} ${err}`);
  }

  const json = await res.json();
  const content = json.choices?.[0]?.message?.content ?? "";

  // 提取JSON
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("DeepSeek returned invalid JSON");

  const parsed = JSON.parse(jsonMatch[0]);
  return {
    intel: parsed.intel ?? "暂无情报",
    homeImpact: Number(parsed.homeImpact ?? 0),
    awayImpact: Number(parsed.awayImpact ?? 0),
  };
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const homeTeam = searchParams.get("home") ?? "";
  const awayTeam = searchParams.get("away") ?? "";

  if (!homeTeam || !awayTeam) {
    return NextResponse.json({ error: "missing home or away param" }, { status: 400 });
  }

  try {
    // 1. 抓新闻标题
    const headlines = await fetchNewsHeadlines(homeTeam, awayTeam);

    if (headlines.length === 0) {
      return NextResponse.json({
        intel: "暂未找到相关新闻，请手动填写情报",
        homeImpact: 0,
        awayImpact: 0,
        headlines: [],
      });
    }

    // 2. DeepSeek 分析
    const result = await analyzeWithDeepSeek(homeTeam, awayTeam, headlines);

    return NextResponse.json({ ...result, headlines });
  } catch (err) {
    console.error("[news/route] error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "unknown error" },
      { status: 500 }
    );
  }
}
