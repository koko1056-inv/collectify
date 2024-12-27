import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

const supabaseUrl = "https://dmgrgzysrzzgsajwqyrh.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRtZ3Jnenlzcnp6Z3NhandxeXJoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDM2NzY5ODAsImV4cCI6MjAxOTI1Mjk4MH0.qDPHvkMYgzGGhI7jivSB7ucAVVxY_lHxII3ZFrOq-Qc";

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);