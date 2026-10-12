"use client";
import { useEffect, useState } from "react";
import type { Track } from "@/lib/types";
import type { Lib } from "@/lib/library";
import { usePlayer } from "./Player";
import { I } from "./Icon";

export function TrackRow({ track, list, index, lib, extra }: { track: Track; list: Track[]; index: number; lib: Lib; extra?: React.ReactNode }) {
  const P = usePlayer();
  const active = P.current?.id === track.id;
  const liked = lib.liked.some((x) => x.id === track.id);
  return (
    <li className="flex items-center gap-2 rounded-lg px-2 py-2 hover:bg-white/[0.04]">
      <button onClick={() => P.play(list, index)} aria-label={`Play ${track.title}`} className="flex min-w-0 flex-1 items-center gap-3 text-left">
        <img src={track.thumb} alt="" loading="lazy" className="h-11 w-11 rounded-md bg-white/5 object-cover" />
        <span className="min-w-0">
          <span className={`block truncate text-sm ${active ? "text-moon" : ""}`}>{track.title}</span>
          <span className="block truncate text-xs text-mute">{track.artist}</span>
        </span>
      </button>
      {extra}
      <button className="icon-btn" onClick={() => P.enqueue(track)} aria-label={`Add ${track.title} to queue`} title="Add to queue"><I n="plus" /></button>
      {lib.playlists.length > 0 && (
        <select aria-label={`Add ${track.title} to a playlist`} value="" onChange={(e) => e.target.value && lib.addTo(e.target.value, track)}
          className="hidden w-24 bg-transparent text-xs text-mute sm:block [&>option]:bg-ink">
          <option value="">Playlist…</option>
          {lib.playlists.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      )}
      <button className={`icon-btn ${liked ? "!text-rose" : ""}`} onClick={() => lib.toggleLike(track)} aria-pressed={liked} aria-label={liked ? "Unlike" : "Like"}>
        <I n="heart" fill={liked} />
      </button>
    </li>
  );
}

const Skeleton = () => (
  <ul className="space-y-2" aria-hidden="true">
    {Array.from({ length: 6 }).map((_, i) => (
      <li key={i} className="flex animate-pulse items-center gap-3 px-2 py-2">
        <div className="h-11 w-11 rounded-md bg-white/5" />
        <div className="flex-1 space-y-2"><div className="h-3 w-2/3 rounded bg-white/5" /><div className="h-3 w-1/3 rounded bg-white/5" /></div>
      </li>
    ))}
  </ul>
);

export function SearchView({ lib }: { lib: Lib }) {
  const P = usePlayer();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Track[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [history, setHistory] = useState<string[]>([]);

  useEffect(() => { try { setHistory(JSON.parse(localStorage.getItem("gmw-searches") || "[]")); } catch { /* ignore */ } }, []);

  async function run(term: string) {
    term = term.trim();
    if (!term) return;
    setQ(term); setLoading(true); setErr(null);
    const h = [term, ...history.filter((x) => x !== term)].slice(0, 6);
    setHistory(h); localStorage.setItem("gmw-searches", JSON.stringify(h));
    try {
      const r = await fetch(`/api/search?q=${encodeURIComponent(term)}`);
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Search failed.");
      setResults(j.tracks);
    } catch (e: any) { setErr(e.message || "Search failed."); setResults(null); }
    finally { setLoading(false); }
  }

  return (
    <section>
      <form onSubmit={(e) => { e.preventDefault(); run(q); }} role="search">
        <label className="sr-only" htmlFor="q">Search songs and artists</label>
        <input id="q" className="input !py-3 text-base" placeholder="Search songs and artists" value={q} onChange={(e) => setQ(e.target.value)} autoComplete="off" />
      </form>
      <div className="mt-6">
        {loading ? <Skeleton />
          : err ? <p role="alert" className="text-sm text-rose">{err}</p>
          : results ? (results.length ? <ul>{results.map((t, i) => <TrackRow key={t.id} track={t} list={results} index={i} lib={lib} />)}</ul>
              : <p className="text-sm text-mute">Nothing matched “{q}”. Try a different spelling or an artist name.</p>)
          : (
            <>
              {history.length > 0 && (
                <div className="mb-8 flex flex-wrap gap-2">
                  {history.map((h) => <button key={h} onClick={() => run(h)} className="rounded-full border border-white/10 px-3 py-1 text-xs text-mute hover:text-white">{h}</button>)}
                </div>
              )}
              {P.recent.length > 0
                ? <><h2 className="mb-2 px-2 text-sm text-mute">Recently played</h2><ul>{P.recent.map((t, i) => <TrackRow key={t.id} track={t} list={P.recent} index={i} lib={lib} />)}</ul></>
                : <p className="text-sm text-mute">Search for something to play.</p>}
            </>
          )}
      </div>
    </section>
  );
}

export function LibraryView({ lib, who }: { lib: Lib; who: string }) {
  const P = usePlayer();
  const [sel, setSel] = useState<string>("liked");
  const [name, setName] = useState("");
  const [renaming, setRenaming] = useState(false);
  const [draft, setDraft] = useState("");

  const pl = lib.playlists.find((p) => p.id === sel);
  useEffect(() => { if (sel !== "liked" && !pl) setSel("liked"); }, [sel, pl]);
  const tracks = sel === "liked" ? lib.liked : pl?.tracks ?? [];

  return (
    <section>
      <p className="mb-6 text-xs text-mute">{who}</p>
      <div className="mb-6 flex flex-wrap items-center gap-2">
        <button onClick={() => setSel("liked")} aria-pressed={sel === "liked"} className={`rounded-full border px-3 py-1 text-xs ${sel === "liked" ? "border-moon text-moon" : "border-white/10 text-mute hover:text-white"}`}>Liked</button>
        {lib.playlists.map((p) => (
          <button key={p.id} onClick={() => { setSel(p.id); setRenaming(false); }} aria-pressed={sel === p.id}
            className={`rounded-full border px-3 py-1 text-xs ${sel === p.id ? "border-moon text-moon" : "border-white/10 text-mute hover:text-white"}`}>{p.name}</button>
        ))}
        <form onSubmit={(e) => { e.preventDefault(); lib.createPlaylist(name); setName(""); }} className="flex items-center gap-1">
          <label className="sr-only" htmlFor="np">New playlist name</label>
          <input id="np" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} placeholder="New playlist" className="w-28 border-b border-white/10 bg-transparent px-1 py-1 text-xs outline-none placeholder:text-mute focus:border-moon/60" />
          <button className="icon-btn !h-7 !w-7" aria-label="Create playlist"><I n="plus" className="h-4 w-4" /></button>
        </form>
      </div>

      {pl && (
        <div className="mb-3 flex items-center gap-3 px-2">
          {renaming ? (
            <form onSubmit={(e) => { e.preventDefault(); lib.rename(pl.id, draft); setRenaming(false); }} className="flex gap-2">
              <input autoFocus value={draft} onChange={(e) => setDraft(e.target.value)} maxLength={80} aria-label="Playlist name" className="input !py-1.5" />
              <button className="btn !py-1.5">Save</button>
            </form>
          ) : (
            <>
              <h2 className="text-lg font-medium">{pl.name}</h2>
              <button onClick={() => { setDraft(pl.name); setRenaming(true); }} className="text-xs text-mute hover:text-white">Rename</button>
              <button onClick={() => confirm(`Delete “${pl.name}”?`) && lib.removePlaylist(pl.id)} className="text-xs text-mute hover:text-rose">Delete</button>
            </>
          )}
        </div>
      )}
      {tracks.length > 0 && (
        <button onClick={() => P.play(tracks, 0)} className="btn-ghost mb-3 ml-2 !py-1.5 text-xs">Play all</button>
      )}

      {tracks.length === 0 ? (
        <p className="px-2 text-sm text-mute">{sel === "liked" ? "Songs you like show up here. Tap the heart on any track." : "This playlist is empty. Use “Playlist…” on a track to add it."}</p>
      ) : (
        <ul>
          {tracks.map((t, i) => (
            <TrackRow key={t.id} track={t} list={tracks} index={i} lib={lib}
              extra={pl && (
                <>
                  <button className="icon-btn" onClick={() => lib.move(pl.id, i, i - 1)} disabled={i === 0} aria-label="Move up"><I n="up" className="h-4 w-4" /></button>
                  <button className="icon-btn" onClick={() => lib.move(pl.id, i, i + 1)} disabled={i === tracks.length - 1} aria-label="Move down"><I n="down" className="h-4 w-4" /></button>
                  <button className="icon-btn" onClick={() => lib.removeFrom(pl.id, t.id)} aria-label="Remove from playlist"><I n="x" className="h-4 w-4" /></button>
                </>
              )} />
          ))}
        </ul>
      )}
    </section>
  );
}
