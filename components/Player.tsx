"use client";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import type { Track } from "@/lib/types";
import { I } from "./Icon";

declare global {
  interface Window { YT: any; onYouTubeIframeAPIReady?: () => void }
}

type Repeat = "off" | "all" | "one";
type Ctx = {
  queue: Track[]; index: number; current: Track | null; playing: boolean; buffering: boolean;
  time: number; duration: number; volume: number; muted: boolean; shuffle: boolean; repeat: Repeat;
  error: string | null; recent: Track[]; showVideo: boolean;
  play: (tracks: Track[], i: number) => void; enqueue: (t: Track) => void; removeAt: (i: number) => void;
  jump: (i: number) => void; next: () => void; prev: () => void; toggle: () => void; seek: (s: number) => void;
  setVolume: (v: number) => void; toggleMute: () => void; toggleShuffle: () => void; cycleRepeat: () => void; toggleVideo: () => void;
};
const C = createContext<Ctx>(null as unknown as Ctx);
export const usePlayer = () => useContext(C);

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const wrap = useRef<HTMLDivElement>(null);
  const yt = useRef<any>(null);
  const pending = useRef<string | null>(null);
  const volRef = useRef(80);
  const errTimer = useRef<ReturnType<typeof setTimeout>>();

  const [queue, setQueue] = useState<Track[]>([]);
  const [index, setIndex] = useState(-1);
  const [playing, setPlaying] = useState(false);
  const [buffering, setBuffering] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDur] = useState(0);
  const [volume, setVol] = useState(80);
  const [muted, setMuted] = useState(false);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState<Repeat>("off");
  const [error, setError] = useState<string | null>(null);
  const [recent, setRecent] = useState<Track[]>([]);
  const [showVideo, setShowVideo] = useState(true);

  const s = useRef({ queue, index, shuffle, repeat, time });
  s.current = { queue, index, shuffle, repeat, time };

  const load = useCallback((q: Track[], i: number) => {
    const t = q[i];
    if (!t) return;
    clearTimeout(errTimer.current);
    setQueue(q); setIndex(i); setError(null); setTime(0); setDur(0);
    s.current = { ...s.current, queue: q, index: i };
    if (yt.current?.loadVideoById) yt.current.loadVideoById(t.id);
    else pending.current = t.id; // player still loading: start as soon as it's ready
    setRecent((r) => {
      const n = [t, ...r.filter((x) => x.id !== t.id)].slice(0, 20);
      try { localStorage.setItem("gmw-recent", JSON.stringify(n)); } catch { /* storage full */ }
      return n;
    });
  }, []);

  const advance = useCallback((dir: 1 | -1, auto = false) => {
    const { queue: q, index: i, shuffle: sh, repeat: rp } = s.current;
    if (!q.length) return;
    if (auto && rp === "one") { yt.current?.seekTo(0, true); yt.current?.playVideo(); return; }
    let n = i + dir;
    if (sh && q.length > 1 && dir === 1) { do { n = Math.floor(Math.random() * q.length); } while (n === i); }
    if (n >= q.length) { if (rp === "all" || !auto) n = 0; else { setPlaying(false); return; } }
    if (n < 0) n = q.length - 1;
    load(q, n);
  }, [load]);
  const adv = useRef(advance);
  adv.current = advance;

  useEffect(() => {
    try { setRecent(JSON.parse(localStorage.getItem("gmw-recent") || "[]")); } catch { /* ignore */ }
    const v = Number(localStorage.getItem("gmw-vol"));
    if (Number.isFinite(v) && localStorage.getItem("gmw-vol") !== null) { volRef.current = v; setVol(v); }

    let dead = false;
    const host = document.createElement("div");
    wrap.current?.appendChild(host);
    const init = () => {
      if (dead) return;
      yt.current = new window.YT.Player(host, {
        width: "100%", height: "100%",
        playerVars: { playsinline: 1, controls: 0, rel: 0, disablekb: 1, modestbranding: 1 },
        events: {
          onReady: () => {
            yt.current.setVolume(volRef.current);
            if (pending.current) { yt.current.loadVideoById(pending.current); pending.current = null; }
          },
          onStateChange: (e: any) => {
            const S = window.YT.PlayerState;
            setPlaying(e.data === S.PLAYING || e.data === S.BUFFERING);
            setBuffering(e.data === S.BUFFERING);
            if (e.data === S.ENDED) adv.current(1, true);
          },
          onError: (e: any) => {
            setPlaying(false); setBuffering(false);
            setError(e.data === 101 || e.data === 150 ? "The owner doesn't allow this video to play outside YouTube."
              : e.data === 100 ? "This video is unavailable." : "This track couldn't be played.");
            if (s.current.queue.length > 1) errTimer.current = setTimeout(() => adv.current(1, true), 2500);
          },
        },
      });
    };
    if (window.YT?.Player) init();
    else {
      window.onYouTubeIframeAPIReady = init;
      if (!document.getElementById("yt-api")) {
        const sc = document.createElement("script");
        sc.id = "yt-api"; sc.src = "https://www.youtube.com/iframe_api";
        sc.onerror = () => setError("Couldn't load the YouTube player. Check your connection.");
        document.body.appendChild(sc);
      }
    }
    const poll = setInterval(() => {
      const p = yt.current;
      if (!p?.getCurrentTime) return;
      setTime(p.getCurrentTime() || 0);
      setDur(p.getDuration?.() || 0);
    }, 250);
    return () => {
      dead = true; clearInterval(poll); clearTimeout(errTimer.current);
      try { yt.current?.destroy(); } catch { /* already gone */ }
      yt.current = null; host.remove();
    };
  }, []);

  const current = queue[index] ?? null;
  const ctx: Ctx = {
    queue, index, current, playing, buffering, time, duration, volume, muted, shuffle, repeat, error, recent, showVideo,
    play: (tracks, i) => load(tracks, i),
    enqueue: (t) => { if (!s.current.queue.length) load([t], 0); else setQueue((q) => (q.some((x) => x.id === t.id) ? q : [...q, t])); },
    removeAt: (i) => { if (i === s.current.index) return; setQueue((q) => q.filter((_, k) => k !== i)); if (i < s.current.index) setIndex((x) => x - 1); },
    jump: (i) => load(s.current.queue, i),
    next: () => advance(1),
    prev: () => { if (s.current.time > 3) { yt.current?.seekTo(0, true); } else advance(-1); },
    toggle: () => { if (!yt.current?.getPlayerState) return; playing ? yt.current.pauseVideo() : yt.current.playVideo(); },
    seek: (x) => { yt.current?.seekTo(x, true); setTime(x); },
    setVolume: (v) => { setVol(v); volRef.current = v; localStorage.setItem("gmw-vol", String(v)); yt.current?.setVolume?.(v); if (v > 0 && muted) { yt.current?.unMute?.(); setMuted(false); } },
    toggleMute: () => { if (muted) yt.current?.unMute?.(); else yt.current?.mute?.(); setMuted(!muted); },
    toggleShuffle: () => setShuffle(!shuffle),
    cycleRepeat: () => setRepeat(repeat === "off" ? "all" : repeat === "all" ? "one" : "off"),
    toggleVideo: () => setShowVideo(!showVideo),
  };

  return (
    <C.Provider value={ctx}>
      {children}
      {/* YouTube's player must stay visible; it can be tucked away with the Video toggle. */}
      <div className={`fixed bottom-44 right-4 z-30 aspect-video w-56 overflow-hidden rounded-xl border border-white/10 bg-black transition-opacity md:bottom-28 ${current && showVideo ? "opacity-100" : "pointer-events-none opacity-0"}`}>
        <div ref={wrap} className="h-full w-full [&_iframe]:h-full [&_iframe]:w-full" />
      </div>
    </C.Provider>
  );
}

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

export function PlayerBar() {
  const P = usePlayer();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName) && !(t as HTMLInputElement).type?.match(/range/)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const k = e.key;
      if (k === " " && t.tagName !== "BUTTON") { e.preventDefault(); P.toggle(); }
      else if (k === "ArrowRight") { e.preventDefault(); e.shiftKey ? P.next() : P.seek(Math.min(P.time + 5, P.duration)); }
      else if (k === "ArrowLeft") { e.preventDefault(); e.shiftKey ? P.prev() : P.seek(Math.max(P.time - 5, 0)); }
      else if (k === "ArrowUp") { e.preventDefault(); P.setVolume(Math.min(P.volume + 5, 100)); }
      else if (k === "ArrowDown") { e.preventDefault(); P.setVolume(Math.max(P.volume - 5, 0)); }
      else if (k === "m") P.toggleMute();
      else if (k === "l") setOpen((o) => !o);
      else if (k === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const t = P.current;
  if (!t) return null;
  return (
    <>
      <div className="fixed inset-x-0 bottom-14 z-30 border-t border-white/5 bg-ink/90 backdrop-blur md:bottom-0 md:left-16">
        <div className="flex items-center gap-3 px-4 pt-2 text-[11px] text-mute">
          <span className="w-9 text-right tabular-nums">{fmt(P.time)}</span>
          <input type="range" aria-label="Seek" min={0} max={P.duration || 1} step={1} value={Math.min(P.time, P.duration || 1)}
            onChange={(e) => P.seek(Number(e.target.value))} className="h-1 flex-1 accent-[#b7a4f5]" />
          <span className="w-9 tabular-nums">{fmt(P.duration)}</span>
        </div>
        <div className="flex items-center gap-2 px-4 pb-3 pt-1">
          <button onClick={() => setOpen(true)} className="flex min-w-0 flex-1 items-center gap-3 text-left" aria-label="Open lyrics and queue">
            <img src={t.thumb} alt="" className="h-10 w-10 rounded-md object-cover" />
            <span className="min-w-0">
              <span className="block truncate text-sm">{t.title}</span>
              <span className={`block truncate text-xs ${P.error ? "text-rose" : "text-mute"}`}>
                {P.error ?? (P.buffering ? "Buffering…" : `${t.artist} · YouTube`)}
              </span>
            </span>
          </button>
          <button className={`icon-btn hidden sm:grid ${P.shuffle ? "!text-moon" : ""}`} onClick={P.toggleShuffle} aria-pressed={P.shuffle} aria-label="Shuffle"><I n="shuffle" /></button>
          <button className="icon-btn" onClick={P.prev} aria-label="Previous"><I n="prev" /></button>
          <button className="grid h-10 w-10 place-items-center rounded-full bg-white text-ink" onClick={P.toggle} aria-label={P.playing ? "Pause" : "Play"}>
            <I n={P.playing ? "pause" : "play"} />
          </button>
          <button className="icon-btn" onClick={P.next} aria-label="Next"><I n="next" /></button>
          <button className={`icon-btn relative hidden sm:grid ${P.repeat !== "off" ? "!text-moon" : ""}`} onClick={P.cycleRepeat} aria-label={`Repeat: ${P.repeat}`}>
            <I n="repeat" />{P.repeat === "one" && <span className="absolute text-[8px] font-bold">1</span>}
          </button>
          <div className="hidden items-center gap-1 md:flex">
            <button className="icon-btn" onClick={P.toggleMute} aria-label={P.muted ? "Unmute" : "Mute"}><I n={P.muted || P.volume === 0 ? "mute" : "vol"} /></button>
            <input type="range" aria-label="Volume" min={0} max={100} value={P.muted ? 0 : P.volume} onChange={(e) => P.setVolume(Number(e.target.value))} className="h-1 w-20 accent-[#b7a4f5]" />
          </div>
          <button className={`icon-btn text-xs ${P.showVideo ? "!text-moon" : ""}`} onClick={P.toggleVideo} aria-pressed={P.showVideo} aria-label="Toggle video">Video</button>
        </div>
      </div>
      {open && <Overlay onClose={() => setOpen(false)} />}
    </>
  );
}

type Line = { t: number; text: string };
function parseLrc(src: string): Line[] {
  const out: Line[] = [];
  for (const row of src.split("\n")) {
    const m = row.match(/^\[(\d+):(\d+(?:\.\d+)?)\](.*)$/);
    if (m) out.push({ t: Number(m[1]) * 60 + Number(m[2]), text: m[3].trim() });
  }
  return out;
}

type LyricsState = { status: "loading" | "done" | "none" | "error"; synced: Line[] | null; plain: string | null };
function useLyrics(t: Track | null): LyricsState {
  const [st, setSt] = useState<LyricsState>({ status: "loading", synced: null, plain: null });
  useEffect(() => {
    if (!t) return;
    let off = false;
    setSt({ status: "loading", synced: null, plain: null });
    fetch(`/api/lyrics?${new URLSearchParams({ title: t.title, artist: t.artist })}`)
      .then((r) => r.json())
      .then((j) => {
        if (off) return;
        if (j.error) return setSt({ status: "error", synced: null, plain: null });
        const synced = j.synced ? parseLrc(j.synced) : null;
        if (synced?.length) setSt({ status: "done", synced, plain: j.plain });
        else if (j.plain) setSt({ status: "done", synced: null, plain: j.plain });
        else setSt({ status: "none", synced: null, plain: null });
      })
      .catch(() => !off && setSt({ status: "error", synced: null, plain: null }));
    return () => { off = true; };
  }, [t?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  return st;
}

function Overlay({ onClose }: { onClose: () => void }) {
  const P = usePlayer();
  const [tab, setTab] = useState<"lyrics" | "queue">("lyrics");
  const L = useLyrics(P.current);
  const refs = useRef<(HTMLParagraphElement | null)[]>([]);

  let active = -1;
  if (L.synced) for (let i = 0; i < L.synced.length; i++) if (L.synced[i].t <= P.time + 0.25) active = i;

  useEffect(() => {
    if (tab !== "lyrics" || active < 0) return;
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    refs.current[active]?.scrollIntoView({ block: "center", behavior: calm ? "auto" : "smooth" });
  }, [active, tab]);

  const t = P.current;
  return (
    <div role="dialog" aria-modal="true" aria-label="Lyrics and queue" className="fixed inset-0 z-40 flex flex-col bg-ink/95 backdrop-blur-md">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex gap-1 text-sm">
          {(["lyrics", "queue"] as const).map((k) => (
            <button key={k} onClick={() => setTab(k)} aria-pressed={tab === k}
              className={`rounded-full px-3 py-1.5 capitalize ${tab === k ? "bg-white/10 text-white" : "text-mute hover:text-white"}`}>{k}</button>
          ))}
        </div>
        <button className="icon-btn" onClick={onClose} aria-label="Close"><I n="x" /></button>
      </div>
      <div className="px-6 pb-2 text-center">
        <p className="truncate text-sm">{t?.title}</p>
        <p className="truncate text-xs text-mute">{t?.artist}</p>
      </div>
      <div className="mx-auto w-full max-w-xl flex-1 overflow-y-auto px-6 pb-40 pt-6">
        {tab === "lyrics" ? (
          L.status === "loading" ? <p className="text-center text-sm text-mute">Looking for lyrics…</p>
          : L.status === "error" ? <p className="text-center text-sm text-rose">Lyrics couldn’t be loaded. Try again in a moment.</p>
          : L.status === "none" ? <p className="text-center text-sm text-mute">No lyrics found for this track.</p>
          : L.synced ? (
            <div className="space-y-5 py-[30vh] text-center">
              {L.synced.map((ln, i) => (
                <p key={i} ref={(el) => { refs.current[i] = el; }}
                  className={`text-2xl font-semibold leading-snug transition-colors ${i === active ? "text-white" : "text-white/25"}`}>{ln.text || "·"}</p>
              ))}
            </div>
          ) : <p className="whitespace-pre-wrap text-center text-base leading-8 text-white/80">{L.plain}</p>
        ) : (
          <ul className="space-y-1">
            {P.queue.map((q, i) => (
              <li key={q.id + i} className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-white/5">
                <button onClick={() => P.jump(i)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                  <img src={q.thumb} alt="" className="h-10 w-10 rounded-md object-cover" />
                  <span className="min-w-0">
                    <span className={`block truncate text-sm ${i === P.index ? "text-moon" : ""}`}>{q.title}</span>
                    <span className="block truncate text-xs text-mute">{q.artist}</span>
                  </span>
                </button>
                {i !== P.index && <button className="icon-btn" onClick={() => P.removeAt(i)} aria-label={`Remove ${q.title} from queue`}><I n="x" className="h-4 w-4" /></button>}
              </li>
            ))}
          </ul>
        )}
        {tab === "lyrics" && L.status === "done" && <p className="mt-10 text-center text-[11px] text-mute">Lyrics from LRCLIB</p>}
      </div>
    </div>
  );
}
