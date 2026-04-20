import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

export const SUPABASE_URL = "https://dmgrgzysrzzgsajwqyrh.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRtZ3Jnenlzcnp6Z3NhandxeXJoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ2MTExODUsImV4cCI6MjA1MDE4NzE4NX0.UsoRjDcgPGmEqmYetdsvH9bk-Zj9-dFz7YuonnF2WT4";

export const supabase = createClient<Database>(
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
    global: {
      headers: {
        'X-Client-Info': 'supabase-js-web',
      },
    },
  }
);