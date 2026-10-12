"use client";
import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { useLibrary } from "@/lib/library";
import { Logo } from "@/components/Logo";
import { Auth } from "@/components/Auth";
import { I } from "@/components/Icon";
import { PlayerBar, PlayerProvider } from "@/components/Player";
import { LibraryView, SearchView } from "@/components/Views";

export default function Page() {
  const [booting, setBooting] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [guest, setGuest] = useState(false);

  useEffect(() => {
    const started = Date.now();
    (async () => {
      if (supabase) {
        const { data } = await supabase.auth.getSession();
        setUser(data.session?.user ?? null);
      }
      setGuest(localStorage.getItem("gmw-guest") === "1");
      setTimeout(() => setBooting(false), Math.max(0, 1100 - (Date.now() - started)));
    })();
    const sub = supabase?.auth.onAuthStateChange((_e, s) => setUser(s?.user ?? null));
    return () => sub?.data.subscription.unsubscribe();
  }, []);

  async function leave() {
    await supabase?.auth.signOut();
    localStorage.removeItem("gmw-guest");
    setGuest(false); setUser(null);
  }

  if (booting)
    return (
      <main className="grid min-h-screen place-items-center">
        <div className="flex w-40 flex-col items-center gap-6">
          <Logo size={48} />
          <div className="h-px w-full bg-white/10"><div className="loadbar h-px bg-moon" /></div>
        </div>
      </main>
    );

  if (!user && !guest) return <Auth onGuest={() => { localStorage.setItem("gmw-guest", "1"); setGuest(true); }} />;
  return <PlayerProvider><Shell user={user} onLeave={leave} /></PlayerProvider>;
}

function Shell({ user, onLeave }: { user: User | null; onLeave: () => void }) {
  const [view, setView] = useState<"search" | "library">("search");
  const lib = useLibrary(user);
  const tabs = [
    { id: "search" as const, label: "Search", icon: "search" },
    { id: "library" as const, label: "Library", icon: "music" },
  ];
  const who = user ? `Signed in as ${user.email}` : "Guest — your library stays on this device. Create an account to keep it.";

  return (
    <div className="min-h-screen">
      <aside className="fixed inset-y-0 left-0 hidden w-16 flex-col items-center justify-between border-r border-white/5 py-5 md:flex">
        <Logo size={18} />
        <nav className="flex flex-col gap-2" aria-label="Main">
          {tabs.map((t) => (
            <button key={t.id} onClick={() => setView(t.id)} aria-label={t.label} aria-current={view === t.id ? "page" : undefined}
              className={`icon-btn !h-11 !w-11 ${view === t.id ? "!text-moon" : ""}`}><I n={t.icon} /></button>
          ))}
        </nav>
        <button onClick={onLeave} className="icon-btn" aria-label={user ? "Sign out" : "Leave guest mode"}><I n="out" /></button>
      </aside>

      <main className="md:ml-16">
        <div className="mx-auto max-w-2xl px-4 pb-64 pt-6 md:pt-10">
          <header className="mb-6 md:hidden"><Logo size={22} /></header>
          {lib.error && (
            <div role="alert" className="mb-4 flex items-start justify-between gap-3 rounded-lg border border-rose/30 px-3 py-2 text-xs text-rose">
              <span>{lib.error}</span>
              <button onClick={lib.clearError} aria-label="Dismiss"><I n="x" className="h-4 w-4" /></button>
            </div>
          )}
          {view === "search" ? <SearchView lib={lib} /> : <LibraryView lib={lib} who={who} />}
        </div>
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-30 flex h-14 items-center justify-around border-t border-white/5 bg-ink md:hidden" aria-label="Main">
        {tabs.map((t) => (
          <button key={t.id} onClick={() => setView(t.id)} aria-label={t.label} aria-current={view === t.id ? "page" : undefined}
            className={`icon-btn !h-11 !w-11 ${view === t.id ? "!text-moon" : ""}`}><I n={t.icon} /></button>
        ))}
        <button onClick={onLeave} className="icon-btn !h-11 !w-11" aria-label={user ? "Sign out" : "Leave guest mode"}><I n="out" /></button>
      </nav>
      <PlayerBar />
    </div>
  );
}
