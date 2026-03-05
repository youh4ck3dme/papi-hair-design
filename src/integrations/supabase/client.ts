// This file has been updated to use purely Supabase Auth
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

const stripBom = (s: string | undefined) => (s ?? "").replace(/^\uFEFF/, "").trim();
const SUPABASE_URL = stripBom(import.meta.env.VITE_SUPABASE_URL);
const SUPABASE_PUBLISHABLE_KEY = stripBom(import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY);

if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY || SUPABASE_URL === "" || SUPABASE_PUBLISHABLE_KEY === "") {
  const errorMsg = "FATAL: Missing Supabase environment variables! " +
    "VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY is not defined. " +
    "If you are on Vercel, go to Project Settings -> Environment Variables and add them.";
  console.error(errorMsg);
  // In production/Vercel, we can try to show a visible error if it's a browser
  if (typeof window !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
      const root = document.getElementById('root');
      if (root) {
        root.innerHTML = `<div style="padding: 20px; color: white; background: red; font-family: sans-serif;">
          <h1>Configuration Error</h1>
          <p>${errorMsg}</p>
        </div>`;
      }
    });
  }
  throw new Error(errorMsg);
}

const supabaseOptions = {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  },
};

export const supabase = createClient<Database>(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY,
  supabaseOptions
);