// This file has been updated to use purely Supabase Auth
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

const stripBom = (s: string | undefined) => (s ?? "").replace(/^\uFEFF/, "").trim();
const SUPABASE_URL = stripBom(import.meta.env.VITE_SUPABASE_URL);
const SUPABASE_PUBLISHABLE_KEY = stripBom(import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY);

if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY || SUPABASE_URL === "" || SUPABASE_PUBLISHABLE_KEY === "") {
  console.error("FATAL: Missing Supabase environment variables. Please check your .env file.");
  throw new Error("Supabase URL and Publishable Key are required check your environment variables.");
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