"use client";
import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "./supabase";
import type { Playlist, Track } from "./types";

const GUEST_KEY = "gmw-guest-lib";

/** Likes and playlists. Signed-in users: Supabase (row-level security). Guests: this device only. */
export function useLibrary(user: User | null) {
  const [liked, setLiked] = useState<Track[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [error, setError] = useState<string | null>(null);
  const uid = user?.id;

  useEffect(() => {
    let off = false;
    (async () => {
      if (!uid || !supabase) {
        try {
          const raw = JSON.parse(localStorage.getItem(GUEST_KEY) || "{}");
          setLiked(raw.liked || []); setPlaylists(raw.playlists || []);
        } catch { /* ignore corrupt data */ }
        return;
      }
      const [l, p] = await Promise.all([
        supabase.from("liked_tracks").select("track").order("created_at", { ascending: false }),
        supabase.from("playlists").select("id,name,tracks").order("created_at"),
      ]);
      if (off) return;
      const e = l.error || p.error;
      if (e) return setError(`${e.message}. Did you run supabase/schema.sql?`);
      setLiked((l.data ?? []).map((r: any) => r.track));
      setPlaylists((p.data ?? []) as Playlist[]);
    })();
    return () => { off = true; };
  }, [uid]);

  const saveGuest = (l: Track[], p: Playlist[]) => localStorage.setItem(GUEST_KEY, JSON.stringify({ liked: l, playlists: p }));
  const fail = (e: { message: string } | null) => { if (e) setError(e.message); };

  const toggleLike = async (t: Track) => {
    const has = liked.some((x) => x.id === t.id);
    const next = has ? liked.filter((x) => x.id !== t.id) : [t, ...liked];
    setLiked(next);
    if (!uid || !supabase) return saveGuest(next, playlists);
    const r = has
      ? await supabase.from("liked_tracks").delete().eq("user_id", uid).eq("track_id", t.id)
      : await supabase.from("liked_tracks").insert({ user_id: uid, track_id: t.id, track: t });
    fail(r.error);
  };

  const createPlaylist = async (name: string) => {
    name = name.trim();
    if (!name) return;
    if (!uid || !supabase) {
      const n = [...playlists, { id: crypto.randomUUID(), name, tracks: [] }];
      setPlaylists(n); return saveGuest(liked, n);
    }
    const r = await supabase.from("playlists").insert({ user_id: uid, name }).select("id,name,tracks").single();
    if (r.error) return fail(r.error);
    setPlaylists([...playlists, r.data as Playlist]);
  };

  const patch = async (id: string, change: Partial<Playlist>) => {
    const n = playlists.map((p) => (p.id === id ? { ...p, ...change } : p));
    setPlaylists(n);
    if (!uid || !supabase) return saveGuest(liked, n);
    fail((await supabase.from("playlists").update(change).eq("id", id)).error);
  };

  const removePlaylist = async (id: string) => {
    const n = playlists.filter((p) => p.id !== id);
    setPlaylists(n);
    if (!uid || !supabase) return saveGuest(liked, n);
    fail((await supabase.from("playlists").delete().eq("id", id)).error);
  };

  const addTo = (id: string, t: Track) => {
    const p = playlists.find((x) => x.id === id);
    if (p && !p.tracks.some((x) => x.id === t.id)) patch(id, { tracks: [...p.tracks, t] });
  };
  const removeFrom = (id: string, trackId: string) => {
    const p = playlists.find((x) => x.id === id);
    if (p) patch(id, { tracks: p.tracks.filter((x) => x.id !== trackId) });
  };
  const move = (id: string, i: number, j: number) => {
    const p = playlists.find((x) => x.id === id);
    if (!p || j < 0 || j >= p.tracks.length) return;
    const tr = [...p.tracks];
    [tr[i], tr[j]] = [tr[j], tr[i]];
    patch(id, { tracks: tr });
  };

  return { liked, playlists, error, clearError: () => setError(null),
    toggleLike, createPlaylist, rename: (id: string, name: string) => name.trim() && patch(id, { name: name.trim() }),
    removePlaylist, addTo, removeFrom, move };
}
export type Lib = ReturnType<typeof useLibrary>;
