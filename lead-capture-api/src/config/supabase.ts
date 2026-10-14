import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { env } from "./env.js";

/**
 * Standard Supabase client using public anon key or service key.
 */
export const supabase: SupabaseClient = createClient(
  env.SUPABASE_URL,
  env.SUPABASE_ANON_KEY || env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  }
);

/**
 * Administrative Supabase client using service role key.
 * ⚠️ WARNING: Bypasses Row Level Security (RLS). Use only for trusted backend tasks.
 */
export const supabaseAdmin: SupabaseClient = createClient(
  env.SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  }
);

/**
 * Create a user-scoped Supabase client for a specific user JWT.
 * Enforces Row Level Security (RLS) under that user's identity.
 */
export const createScopedClient = (accessToken: string): SupabaseClient => {
  return createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  });
};
