import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// "Remember me": persist in localStorage when ticked, otherwise only for the tab session.
const storage = {
  getItem: (k: string) =>
    typeof window === "undefined" ? null : localStorage.getItem(k) ?? sessionStorage.getItem(k),
  setItem: (k: string, v: string) => {
    const remember = localStorage.getItem("gmw-remember") !== "0";
    (remember ? localStorage : sessionStorage).setItem(k, v);
    (remember ? sessionStorage : localStorage).removeItem(k);
  },
  removeItem: (k: string) => {
    localStorage.removeItem(k);
    sessionStorage.removeItem(k);
  },
};

export const supabase: SupabaseClient | null =
  url && anon
    ? createClient(url, anon, { auth: { persistSession: true, autoRefreshToken: true, storage } })
    : null;
