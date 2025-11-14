import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';

const url =
  process.env.EXPO_PUBLIC_SUPABASE_URL ||
  Constants.expoConfig?.extra?.supabaseUrl;

const anon =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  Constants.expoConfig?.extra?.supabaseAnonKey;

// Minimal, safe diagnostics (don’t log full key)
console.log('[Supabase ENV]', {
  url,
  anonLen: anon?.length,
  anonPrefix: anon?.slice?.(0, 8),
});

if (!url || !anon) {
  throw new Error(
    'Supabase env missing. Check app.config.js extra + .env (EXPO_PUBLIC_*).'
  );
}

export const supabase = createClient(url, anon, {
  auth: { persistSession: true, autoRefreshToken: true },
});
