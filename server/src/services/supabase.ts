import { createClient } from '@supabase/supabase-js';
import { config, requireSupabase } from '../config.js';

export function getSupabase() {
  requireSupabase();
  return createClient(config.supabaseUrl, config.supabaseServiceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
}
