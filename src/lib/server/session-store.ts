import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';
import { getSupabaseAdmin } from '@/lib/server/supabase-admin';

export type SessionRecord = {
  id: string;
  email: string;
  createdAt: string;
  lastActivityAt: string;
  expiresAt: string;
};

type SessionStore = {
  sessions: SessionRecord[];
};

const dataDir = path.join(process.cwd(), 'data');
const filePath = path.join(dataDir, 'sessions.json');
const APP_SESSIONS_TABLE = 'app_sessions';

export async function createSession(email: string, ttlSeconds: number): Promise<string> {
  const fromSupabase = await createSessionSupabase(email, ttlSeconds);
  if (fromSupabase) return fromSupabase;

  const store = await readStore();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + ttlSeconds * 1000);
  const id = crypto.randomUUID();

  store.sessions = store.sessions.filter((session) => new Date(session.expiresAt).getTime() > Date.now());
  store.sessions.push({
    id,
    email: normalizeEmail(email),
    createdAt: now.toISOString(),
    lastActivityAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
  });

  await writeStore(store);
  return id;
}

export async function getSession(sessionId: string): Promise<SessionRecord | null> {
  const fromSupabase = await getSessionSupabase(sessionId);
  if (fromSupabase) return fromSupabase;

  const store = await readStore();
  const session = store.sessions.find((item) => item.id === sessionId);
  if (!session) return null;
  if (new Date(session.expiresAt).getTime() <= Date.now()) return null;
  return session;
}

export async function touchSession(sessionId: string, ttlSeconds: number): Promise<SessionRecord | null> {
  const fromSupabase = await touchSessionSupabase(sessionId, ttlSeconds);
  if (fromSupabase) return fromSupabase;

  const store = await readStore();
  const idx = store.sessions.findIndex((item) => item.id === sessionId);
  if (idx === -1) return null;

  const current = store.sessions[idx];
  if (new Date(current.expiresAt).getTime() <= Date.now()) {
    store.sessions.splice(idx, 1);
    await writeStore(store);
    return null;
  }

  const now = new Date();
  const nextExpires = new Date(now.getTime() + ttlSeconds * 1000);
  const updated: SessionRecord = {
    ...current,
    lastActivityAt: now.toISOString(),
    expiresAt: nextExpires.toISOString(),
  };
  store.sessions[idx] = updated;
  await writeStore(store);
  return updated;
}

export async function revokeSession(sessionId: string): Promise<void> {
  const usedSupabase = await revokeSessionSupabase(sessionId);
  if (usedSupabase) return;

  const store = await readStore();
  store.sessions = store.sessions.filter((item) => item.id !== sessionId);
  await writeStore(store);
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function mapSessionRow(row: Record<string, unknown>): SessionRecord {
  return {
    id: String(row.id || ''),
    email: normalizeEmail(String(row.email || '')),
    createdAt: String(row.created_at || new Date().toISOString()),
    lastActivityAt: String(row.last_activity_at || new Date().toISOString()),
    expiresAt: String(row.expires_at || new Date().toISOString()),
  };
}

async function createSessionSupabase(email: string, ttlSeconds: number): Promise<string | null> {
  const admin = getSupabaseAdmin();
  if (!admin) return null;

  const now = new Date();
  const id = crypto.randomUUID();
  const expiresAt = new Date(now.getTime() + ttlSeconds * 1000).toISOString();
  const { error } = await admin.from(APP_SESSIONS_TABLE).insert({
    id,
    email: normalizeEmail(email),
    created_at: now.toISOString(),
    last_activity_at: now.toISOString(),
    expires_at: expiresAt,
  });

  if (error) {
    console.error('Supabase createSession error:', error.message);
    return null;
  }

  return id;
}

async function getSessionSupabase(sessionId: string): Promise<SessionRecord | null> {
  const admin = getSupabaseAdmin();
  if (!admin) return null;

  const { data, error } = await admin
    .from(APP_SESSIONS_TABLE)
    .select('id, email, created_at, last_activity_at, expires_at')
    .eq('id', sessionId)
    .maybeSingle();

  if (error) {
    console.error('Supabase getSession error:', error.message);
    return null;
  }
  if (!data) return null;

  const session = mapSessionRow(data);
  if (new Date(session.expiresAt).getTime() <= Date.now()) {
    await revokeSessionSupabase(sessionId);
    return null;
  }

  return session;
}

async function touchSessionSupabase(sessionId: string, ttlSeconds: number): Promise<SessionRecord | null> {
  const admin = getSupabaseAdmin();
  if (!admin) return null;

  const current = await getSessionSupabase(sessionId);
  if (!current) return null;

  const now = new Date();
  const expiresAt = new Date(now.getTime() + ttlSeconds * 1000).toISOString();
  const { data, error } = await admin
    .from(APP_SESSIONS_TABLE)
    .update({
      last_activity_at: now.toISOString(),
      expires_at: expiresAt,
    })
    .eq('id', sessionId)
    .select('id, email, created_at, last_activity_at, expires_at')
    .maybeSingle();

  if (error) {
    console.error('Supabase touchSession error:', error.message);
    return null;
  }
  if (!data) return null;
  return mapSessionRow(data);
}

async function revokeSessionSupabase(sessionId: string): Promise<boolean> {
  const admin = getSupabaseAdmin();
  if (!admin) return false;

  const { error } = await admin.from(APP_SESSIONS_TABLE).delete().eq('id', sessionId);
  if (error) {
    console.error('Supabase revokeSession error:', error.message);
    return false;
  }
  return true;
}

async function readStore(): Promise<SessionStore> {
  await ensureStore();
  const raw = await fs.readFile(filePath, 'utf8');
  try {
    const parsed = JSON.parse(raw) as SessionStore;
    return {
      sessions: Array.isArray(parsed?.sessions) ? parsed.sessions : [],
    };
  } catch {
    return { sessions: [] };
  }
}

async function writeStore(store: SessionStore): Promise<void> {
  await ensureStore();
  await fs.writeFile(filePath, JSON.stringify(store, null, 2), 'utf8');
}

async function ensureStore(): Promise<void> {
  await fs.mkdir(dataDir, { recursive: true });
  try {
    await fs.access(filePath);
  } catch {
    await fs.writeFile(filePath, JSON.stringify({ sessions: [] }, null, 2), 'utf8');
  }
}
