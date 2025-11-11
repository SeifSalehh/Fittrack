// lib/supabase.js
import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';

// Prefer process.env (Expo inlines these), fall back to app.config.js extra
const envUrl  = process.env.EXPO_PUBLIC_SUPABASE_URL;
const envAnon = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

const extra = Constants?.expoConfig?.extra ?? {};
const url   = envUrl  ?? extra.EXPO_PUBLIC_SUPABASE_URL;
const anon  = envAnon ?? extra.EXPO_PUBLIC_SUPABASE_ANON_KEY;

// Debug once (you can remove after it works)
console.log('[Supabase] url present?', !!url, 'anon present?', !!anon);

if (!url || !anon) {
  throw new Error('Supabase env vars missing. Check .env and app.config.js');
}

export const supabase = createClient(url, anon);
