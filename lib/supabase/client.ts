import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export function getSupabase() {
  if (!url || !key) return null;
  return createClient<Database>(url, key, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  });
}
