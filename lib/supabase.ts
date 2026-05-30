// Supabase server client — uses the service-role key so RLS is bypassed.
// All operations in this app go through server-side routes or Server
// Components, so we never expose this key to the browser.

import { createClient } from "@supabase/supabase-js";

function createSupabaseClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set. " +
        "Add them in your Vercel project environment variables.",
    );
  }
  return createClient(url, key, {
    auth: { persistSession: false },
  });
}

// Singleton — one client per server process.
let _client: ReturnType<typeof createClient> | null = null;

export function getSupabase() {
  if (!_client) _client = createSupabaseClient();
  return _client;
}
