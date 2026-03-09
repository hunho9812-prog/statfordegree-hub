import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

function isValidHttpUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

const configured = Boolean(
  supabaseUrl && supabaseAnonKey && isValidHttpUrl(supabaseUrl)
);

export const isSupabaseConfigured = configured;

export const supabase = configured
  ? createClient(supabaseUrl!, supabaseAnonKey!)
  : null;
