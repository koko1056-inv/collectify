import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://dmgrgzysrzzgsajwqyrh.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRtZ3Jnenlzcnp6Z3NhandxeXJoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDMxNzQ5NDAsImV4cCI6MjAxODc1MDk0MH0.xqzYLy_7XQK0zS7C5H6f8QyX0WXxR1rWwzde_PzmkOs'

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
})