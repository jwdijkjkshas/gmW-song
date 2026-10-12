import { NextRequest, NextResponse } from "next/server";

// LRCLIB is an open lyrics database with synced (LRC) lyrics and a public API.
const H = { "User-Agent": "gmW-Lunar-Music/0.1" };

async function lookup(params: Record<string, string>) {
  const u = new URL("https://lrclib.net/api/search");
  Object.entries(params).forEach(([k, v]) => u.searchParams.set(k, v));
  const r = await fetch(u, { headers: H, next: { revalidate: 86400 } });
  if (!r.ok) return [];
  const j = await r.json();
  return Array.isArray(j) ? j : [];
}

export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  const rawTitle = p.get("title") ?? "";
  let artist = p.get("artist") ?? "";
  let track = rawTitle
    .replace(/[\(\[].*?[\)\]]/g, "")
    .replace(/\b(official|lyrics?|video|audio|hd|4k|mv)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
  const parts = track.split(" - ");
  if (parts.length >= 2) { artist = parts[0].trim(); track = parts.slice(1).join(" - ").trim(); }
  if (!track) return NextResponse.json({ synced: null, plain: null });

  try {
    let hits = await lookup({ track_name: track, artist_name: artist });
    if (!hits.length) hits = await lookup({ q: `${artist} ${track}`.trim() });
    const best = hits.find((h: any) => h.syncedLyrics) ?? hits.find((h: any) => h.plainLyrics);
    return NextResponse.json({ synced: best?.syncedLyrics ?? null, plain: best?.plainLyrics ?? null });
  } catch {
    return NextResponse.json({ error: "Lyrics service unreachable." }, { status: 502 });
  }
}
