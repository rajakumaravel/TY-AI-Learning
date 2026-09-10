import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL || 'https://invalid.supabase.local';
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'missing-anon-key';

const supabase = createClient(url, anonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});

function clearSessionCookie() {
  document.cookie = 'sb_access_token=; Path=/; Max-Age=0; SameSite=Lax; Secure';
}

function syncSessionCookie(session) {
  if (!session?.access_token) return clearSessionCookie();
  const maxAge = Math.max(60, Number(session.expires_in || 3600));
  document.cookie = `sb_access_token=${encodeURIComponent(session.access_token)}; Path=/; Max-Age=${maxAge}; SameSite=Lax; Secure`;
}

function normalizeUser(user) {
  if (!user) return null;
  const metadata = user.user_metadata || {};
  const roles = [];
  const appRole = user.app_metadata?.role;
  if (typeof appRole === 'string') roles.push(appRole);
  if (Array.isArray(user.app_metadata?.roles)) roles.push(...user.app_metadata.roles);
  return {
    id: user.id,
    email: user.email || '',
    userMetadata: {
      ...metadata,
      full_name: metadata.full_name || metadata.name || user.email?.split('@')[0] || 'Student'
    },
    roles
  };
}

export async function handleAuthCallback() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  syncSessionCookie(data.session);
  return data.session;
}

export async function getUser() {
  const { data: sessionData } = await supabase.auth.getSession();
  syncSessionCookie(sessionData.session);
  if (!sessionData.session) return null;
  const { data, error } = await supabase.auth.getUser();
  if (error) return null;
  return normalizeUser(data.user);
}

export async function oauthLogin(provider='google') {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo: `${window.location.origin}${window.location.pathname}` }
  });
  if (error) throw error;
  return data;
}

export async function logout() {
  const { error } = await supabase.auth.signOut();
  clearSessionCookie();
  if (error) throw error;
}

supabase.auth.onAuthStateChange((_event, session) => syncSessionCookie(session));

export { supabase };
