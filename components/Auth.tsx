"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { Logo } from "./Logo";

export function Auth({ onGuest }: { onGuest: () => void }) {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [remember, setRemember] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null); setInfo(null);
    if (!/^\S+@\S+\.\S+$/.test(email)) return setErr("Enter a valid email address.");
    if (password.length < 8) return setErr("Use at least 8 characters for your password.");
    if (!supabase) return setErr("Accounts aren't set up yet. Add the Supabase variables, or continue as a guest.");
    setBusy(true);
    localStorage.setItem("gmw-remember", remember ? "1" : "0");
    const r = mode === "login"
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password });
    setBusy(false);
    if (r.error) return setErr(r.error.message);
    if (mode === "signup" && !r.data.session) setInfo("Check your email to confirm your account, then log in.");
  }

  return (
    <main className="grid min-h-screen place-items-center px-6">
      <div className="w-full max-w-xs">
        <div className="mb-12 flex justify-center"><Logo size={64} dodge /></div>
        <form onSubmit={submit} className="space-y-3" noValidate>
          <label className="block">
            <span className="sr-only">Email</span>
            <input className="input" type="email" autoComplete="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          <div className="relative">
            <label>
              <span className="sr-only">Password</span>
              <input className="input pr-14" type={show ? "text" : "password"} autoComplete={mode === "login" ? "current-password" : "new-password"}
                placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </label>
            <button type="button" onClick={() => setShow(!show)} aria-pressed={show}
              className="absolute right-2 top-1/2 -translate-y-1/2 px-2 text-xs text-mute hover:text-white">
              {show ? "Hide" : "Show"}
            </button>
          </div>
          <label className="flex items-center gap-2 text-xs text-mute">
            <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="accent-[#b7a4f5]" />
            Remember me
          </label>
          {err && <p role="alert" className="text-xs text-rose">{err}</p>}
          {info && <p role="status" className="text-xs text-moon">{info}</p>}
          <button className="btn w-full" disabled={busy}>{busy ? "Please wait…" : mode === "login" ? "Log in" : "Create account"}</button>
        </form>
        <div className="mt-4 flex items-center justify-between text-xs text-mute">
          <button onClick={() => { setMode(mode === "login" ? "signup" : "login"); setErr(null); setInfo(null); }} className="hover:text-white">
            {mode === "login" ? "Create an account" : "I have an account"}
          </button>
          <button onClick={onGuest} className="hover:text-white">Continue as guest</button>
        </div>
        {!supabase && <p className="mt-8 text-center text-xs text-mute">Supabase isn’t configured, so only guest mode works.</p>}
      </div>
    </main>
  );
}
