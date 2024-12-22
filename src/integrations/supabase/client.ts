import { createClient } from '@supabase/supabase-js'
import type { Database } from './types'

const supabaseUrl = 'https://dmgrgzysrzzgsajwqyrh.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRtZ3Jnenlzcnp6Z3NhandxeXJoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDk2MzI5NjAsImV4cCI6MjAyNTIwODk2MH0.sPvwzUJbhC5d8nLaHVvwrWqrZBBIXV_7eQeYgJzFNtE'

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce'
  },
  global: {
    headers: {
      'X-Client-Info': 'supabase-js-web'
    }
  }
})