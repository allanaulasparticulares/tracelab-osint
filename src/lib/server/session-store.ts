import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';

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

export async function createSession(email: string, ttlSeconds: number): Promise<string> {
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
  const store = await readStore();
  const session = store.sessions.find((item) => item.id === sessionId);
  if (!session) return null;
  if (new Date(session.expiresAt).getTime() <= Date.now()) return null;
  return session;
}

export async function touchSession(sessionId: string, ttlSeconds: number): Promise<SessionRecord | null> {
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
  const store = await readStore();
  store.sessions = store.sessions.filter((item) => item.id !== sessionId);
  await writeStore(store);
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
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
