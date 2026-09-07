import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://kfoaphvuwhksdpclfzna.supabase.co';
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? 'sb_publishable_X8DF_BdwTLQ5F77CfCFmjQ_qL6BTE9Z';
let browserClient: SupabaseClient<Database> | null = null;

export function getSupabase() {
  if (!url || !key) return null;
  if (!browserClient) {
    browserClient = createClient<Database>(url, key, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    });
  }
  return browserClient;
}
