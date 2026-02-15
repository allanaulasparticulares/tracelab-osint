import { getSupabaseAdmin } from '@/lib/server/supabase-admin';

const PROFILE_TABLE = 'app_user_profiles';

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function fallbackNameFromEmail(email: string): string {
  return email.split('@')[0] || 'Investigador';
}

function normalizeDisplayName(name: string | null | undefined, email: string): string {
  const safe = String(name || '').trim();
  return safe || fallbackNameFromEmail(email);
}

export async function upsertUserProfile(input: {
  email: string;
  displayName?: string;
  markLogin?: boolean;
}): Promise<string> {
  const email = normalizeEmail(input.email);
  const displayName = normalizeDisplayName(input.displayName, email);
  const nowIso = new Date().toISOString();
  const admin = getSupabaseAdmin();

  if (!admin) {
    return displayName;
  }

  const payload: {
    email: string;
    display_name: string;
    updated_at: string;
    last_login_at?: string;
  } = {
    email,
    display_name: displayName,
    updated_at: nowIso,
  };

  if (input.markLogin) {
    payload.last_login_at = nowIso;
  }

  const { data, error } = await admin
    .from(PROFILE_TABLE)
    .upsert(payload, { onConflict: 'email' })
    .select('display_name')
    .single();

  if (error) {
    console.error('Supabase profile upsert error:', error.message);
    return displayName;
  }

  return normalizeDisplayName(data?.display_name, email);
}

export async function getUserProfileName(email: string): Promise<string | null> {
  const admin = getSupabaseAdmin();
  if (!admin) return null;

  const normalizedEmail = normalizeEmail(email);
  const { data, error } = await admin
    .from(PROFILE_TABLE)
    .select('display_name')
    .eq('email', normalizedEmail)
    .maybeSingle();

  if (error) {
    console.error('Supabase profile query error:', error.message);
    return null;
  }

  const name = String(data?.display_name || '').trim();
  return name || null;
}
