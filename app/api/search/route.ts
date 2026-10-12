import { NextRequest, NextResponse } from "next/server";

const decode = (s: string) =>
  s.replace(/&amp;/g, "&").replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">");

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim();
  if (!q) return NextResponse.json({ tracks: [] });

  const key = process.env.YOUTUBE_API_KEY;
  if (!key) return NextResponse.json({ error: "Search isn't set up: YOUTUBE_API_KEY is missing on the server." }, { status: 501 });

  const url = new URL("https://www.googleapis.com/youtube/v3/search");
  url.search = new URLSearchParams({
    part: "snippet", type: "video", videoCategoryId: "10", videoEmbeddable: "true", maxResults: "20", q, key,
  }).toString();

  const res = await fetch(url, { next: { revalidate: 300 } });
  if (!res.ok) {
    const e = await res.json().catch(() => null);
    return NextResponse.json({ error: e?.error?.message ?? "YouTube search failed." }, { status: 502 });
  }
  const json = await res.json();
  const tracks = (json.items ?? []).map((i: any) => ({
    id: i.id.videoId,
    title: decode(i.snippet.title),
    artist: decode(i.snippet.channelTitle).replace(/ - Topic$/, ""),
    thumb: i.snippet.thumbnails?.medium?.url ?? i.snippet.thumbnails?.default?.url ?? "",
  }));
  return NextResponse.json({ tracks });
}
