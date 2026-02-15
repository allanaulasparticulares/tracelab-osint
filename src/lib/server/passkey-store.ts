import { promises as fs } from 'fs';
import path from 'path';
import { getSupabaseAdmin } from '@/lib/server/supabase-admin';

export type ChallengeType = 'register' | 'login';

export type PasskeyCredentialRecord = {
  id: string;
  publicKeyPem: string;
  algorithm: number;
  counter: number;
  transports: string[];
  createdAt: string;
  updatedAt: string;
};

export type PasskeyUserRecord = {
  email: string;
  displayName: string;
  createdAt: string;
  updatedAt: string;
  credentials: PasskeyCredentialRecord[];
};

type ChallengeRecord = {
  email: string;
  type: ChallengeType;
  challenge: string;
  rpId: string;
  origin: string;
  createdAt: string;
  expiresAt: string;
};

type PasskeyStore = {
  users: PasskeyUserRecord[];
  challenges: ChallengeRecord[];
};

const dataDir = path.join(process.cwd(), 'data');
const filePath = path.join(dataDir, 'passkeys.json');
const PASSKEY_USERS_TABLE = 'app_passkey_users';
const PASSKEY_CREDENTIALS_TABLE = 'app_passkey_credentials';
const PASSKEY_CHALLENGES_TABLE = 'app_passkey_challenges';

export async function getPasskeyUser(email: string): Promise<PasskeyUserRecord | null> {
  const fromSupabase = await getPasskeyUserSupabase(email);
  if (fromSupabase) return fromSupabase;

  const store = await readStore();
  const normalized = normalizeEmail(email);
  return store.users.find((u) => normalizeEmail(u.email) === normalized) || null;
}

export async function upsertPasskeyCredential(input: {
  email: string;
  displayName: string;
  credentialId: string;
  publicKeyPem: string;
  algorithm: number;
  transports?: string[];
}): Promise<void> {
  const usedSupabase = await upsertPasskeyCredentialSupabase(input);
  if (usedSupabase) return;

  const store = await readStore();
  const now = new Date().toISOString();
  const email = normalizeEmail(input.email);
  const transports = input.transports || [];

  let user = store.users.find((u) => normalizeEmail(u.email) === email);
  if (!user) {
    user = {
      email,
      displayName: input.displayName || email,
      createdAt: now,
      updatedAt: now,
      credentials: [],
    };
    store.users.push(user);
  }

  const existing = user.credentials.find((c) => c.id === input.credentialId);
  if (existing) {
    existing.publicKeyPem = input.publicKeyPem;
    existing.algorithm = input.algorithm;
    existing.transports = transports;
    existing.updatedAt = now;
  } else {
    user.credentials.push({
      id: input.credentialId,
      publicKeyPem: input.publicKeyPem,
      algorithm: input.algorithm,
      counter: 0,
      transports,
      createdAt: now,
      updatedAt: now,
    });
  }

  user.updatedAt = now;
  await writeStore(store);
}

export async function setPasskeyChallenge(input: {
  email: string;
  type: ChallengeType;
  challenge: string;
  rpId: string;
  origin: string;
  ttlMs: number;
}): Promise<void> {
  const usedSupabase = await setPasskeyChallengeSupabase(input);
  if (usedSupabase) return;

  const store = await readStore();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + input.ttlMs).toISOString();
  const normalized = normalizeEmail(input.email);

  store.challenges = store.challenges.filter(
    (c) => !(normalizeEmail(c.email) === normalized && c.type === input.type)
  );

  store.challenges.push({
    email: normalized,
    type: input.type,
    challenge: input.challenge,
    rpId: input.rpId,
    origin: input.origin,
    createdAt: now.toISOString(),
    expiresAt,
  });

  await writeStore(store);
}

export async function consumePasskeyChallenge(email: string, type: ChallengeType): Promise<ChallengeRecord | null> {
  const fromSupabase = await consumePasskeyChallengeSupabase(email, type);
  if (fromSupabase) return fromSupabase;

  const store = await readStore();
  const normalized = normalizeEmail(email);
  const idx = store.challenges.findIndex((c) => normalizeEmail(c.email) === normalized && c.type === type);
  if (idx === -1) return null;

  const [challenge] = store.challenges.splice(idx, 1);
  await writeStore(store);

  if (new Date(challenge.expiresAt).getTime() < Date.now()) {
    return null;
  }

  return challenge;
}

export async function listCredentialDescriptors(email: string): Promise<Array<{ id: string; transports: string[] }>> {
  const fromSupabase = await listCredentialDescriptorsSupabase(email);
  if (fromSupabase) return fromSupabase;

  const user = await getPasskeyUser(email);
  if (!user) return [];
  return user.credentials.map((credential) => ({
    id: credential.id,
    transports: credential.transports || [],
  }));
}

export async function getCredentialForUser(email: string, credentialId: string): Promise<PasskeyCredentialRecord | null> {
  const fromSupabase = await getCredentialForUserSupabase(email, credentialId);
  if (fromSupabase) return fromSupabase;

  const user = await getPasskeyUser(email);
  if (!user) return null;
  return user.credentials.find((credential) => credential.id === credentialId) || null;
}

export async function updateCredentialCounter(email: string, credentialId: string, nextCounter: number): Promise<void> {
  const usedSupabase = await updateCredentialCounterSupabase(email, credentialId, nextCounter);
  if (usedSupabase) return;

  const store = await readStore();
  const normalized = normalizeEmail(email);
  const user = store.users.find((u) => normalizeEmail(u.email) === normalized);
  if (!user) return;

  const credential = user.credentials.find((c) => c.id === credentialId);
  if (!credential) return;

  credential.counter = nextCounter;
  credential.updatedAt = new Date().toISOString();
  user.updatedAt = credential.updatedAt;
  await writeStore(store);
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function toIsoOrNow(value: unknown): string {
  if (typeof value === 'string' && value.trim()) return value;
  return new Date().toISOString();
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string');
}

async function getPasskeyUserSupabase(email: string): Promise<PasskeyUserRecord | null> {
  const admin = getSupabaseAdmin();
  if (!admin) return null;

  const normalized = normalizeEmail(email);
  const { data: userData, error: userError } = await admin
    .from(PASSKEY_USERS_TABLE)
    .select('email, display_name, created_at, updated_at')
    .eq('email', normalized)
    .maybeSingle();

  if (userError) {
    console.error('Supabase getPasskeyUser error:', userError.message);
    return null;
  }

  if (!userData) return null;

  const { data: credentialsData, error: credentialsError } = await admin
    .from(PASSKEY_CREDENTIALS_TABLE)
    .select('credential_id, public_key_pem, algorithm, counter, transports, created_at, updated_at')
    .eq('email', normalized);

  if (credentialsError) {
    console.error('Supabase getPasskeyUser credentials error:', credentialsError.message);
    return null;
  }

  const credentials = (credentialsData || []).map((row) => ({
    id: String(row.credential_id || ''),
    publicKeyPem: String(row.public_key_pem || ''),
    algorithm: Number(row.algorithm || -7),
    counter: Number(row.counter || 0),
    transports: toStringArray(row.transports),
    createdAt: toIsoOrNow(row.created_at),
    updatedAt: toIsoOrNow(row.updated_at),
  }));

  return {
    email: normalized,
    displayName: String(userData.display_name || normalized),
    createdAt: toIsoOrNow(userData.created_at),
    updatedAt: toIsoOrNow(userData.updated_at),
    credentials,
  };
}

async function upsertPasskeyCredentialSupabase(input: {
  email: string;
  displayName: string;
  credentialId: string;
  publicKeyPem: string;
  algorithm: number;
  transports?: string[];
}): Promise<boolean> {
  const admin = getSupabaseAdmin();
  if (!admin) return false;

  const now = new Date().toISOString();
  const email = normalizeEmail(input.email);
  const displayName = String(input.displayName || '').trim() || email;
  const transports = input.transports || [];

  const { error: userError } = await admin.from(PASSKEY_USERS_TABLE).upsert(
    {
      email,
      display_name: displayName,
      updated_at: now,
    },
    { onConflict: 'email' }
  );

  if (userError) {
    console.error('Supabase upsert passkey user error:', userError.message);
    return false;
  }

  const { error: credentialError } = await admin.from(PASSKEY_CREDENTIALS_TABLE).upsert(
    {
      email,
      credential_id: input.credentialId,
      public_key_pem: input.publicKeyPem,
      algorithm: input.algorithm,
      transports,
      updated_at: now,
    },
    { onConflict: 'credential_id' }
  );

  if (credentialError) {
    console.error('Supabase upsert passkey credential error:', credentialError.message);
    return false;
  }

  return true;
}

async function setPasskeyChallengeSupabase(input: {
  email: string;
  type: ChallengeType;
  challenge: string;
  rpId: string;
  origin: string;
  ttlMs: number;
}): Promise<boolean> {
  const admin = getSupabaseAdmin();
  if (!admin) return false;

  const now = new Date();
  const email = normalizeEmail(input.email);
  const expiresAt = new Date(now.getTime() + input.ttlMs).toISOString();

  const { error } = await admin.from(PASSKEY_CHALLENGES_TABLE).upsert(
    {
      email,
      type: input.type,
      challenge: input.challenge,
      rp_id: input.rpId,
      origin: input.origin,
      created_at: now.toISOString(),
      expires_at: expiresAt,
    },
    { onConflict: 'email,type' }
  );

  if (error) {
    console.error('Supabase set passkey challenge error:', error.message);
    return false;
  }

  return true;
}

async function consumePasskeyChallengeSupabase(email: string, type: ChallengeType): Promise<ChallengeRecord | null> {
  const admin = getSupabaseAdmin();
  if (!admin) return null;

  const normalized = normalizeEmail(email);
  const { data, error } = await admin
    .from(PASSKEY_CHALLENGES_TABLE)
    .select('email, type, challenge, rp_id, origin, created_at, expires_at')
    .eq('email', normalized)
    .eq('type', type)
    .maybeSingle();

  if (error) {
    console.error('Supabase consume passkey challenge read error:', error.message);
    return null;
  }

  if (!data) return null;

  const { error: deleteError } = await admin
    .from(PASSKEY_CHALLENGES_TABLE)
    .delete()
    .eq('email', normalized)
    .eq('type', type);
  if (deleteError) {
    console.error('Supabase consume passkey challenge delete error:', deleteError.message);
    return null;
  }

  const challenge = {
    email: normalized,
    type,
    challenge: String(data.challenge || ''),
    rpId: String(data.rp_id || ''),
    origin: String(data.origin || ''),
    createdAt: toIsoOrNow(data.created_at),
    expiresAt: toIsoOrNow(data.expires_at),
  };

  if (new Date(challenge.expiresAt).getTime() < Date.now()) {
    return null;
  }

  return challenge;
}

async function listCredentialDescriptorsSupabase(
  email: string
): Promise<Array<{ id: string; transports: string[] }> | null> {
  const admin = getSupabaseAdmin();
  if (!admin) return null;

  const normalized = normalizeEmail(email);
  const { data, error } = await admin
    .from(PASSKEY_CREDENTIALS_TABLE)
    .select('credential_id, transports')
    .eq('email', normalized);

  if (error) {
    console.error('Supabase list passkey credentials error:', error.message);
    return null;
  }

  return (data || []).map((row) => ({
    id: String(row.credential_id || ''),
    transports: toStringArray(row.transports),
  }));
}

async function getCredentialForUserSupabase(email: string, credentialId: string): Promise<PasskeyCredentialRecord | null> {
  const admin = getSupabaseAdmin();
  if (!admin) return null;

  const normalized = normalizeEmail(email);
  const { data, error } = await admin
    .from(PASSKEY_CREDENTIALS_TABLE)
    .select('credential_id, public_key_pem, algorithm, counter, transports, created_at, updated_at')
    .eq('email', normalized)
    .eq('credential_id', credentialId)
    .maybeSingle();

  if (error) {
    console.error('Supabase get credential error:', error.message);
    return null;
  }
  if (!data) return null;

  return {
    id: String(data.credential_id || ''),
    publicKeyPem: String(data.public_key_pem || ''),
    algorithm: Number(data.algorithm || -7),
    counter: Number(data.counter || 0),
    transports: toStringArray(data.transports),
    createdAt: toIsoOrNow(data.created_at),
    updatedAt: toIsoOrNow(data.updated_at),
  };
}

async function updateCredentialCounterSupabase(
  email: string,
  credentialId: string,
  nextCounter: number
): Promise<boolean> {
  const admin = getSupabaseAdmin();
  if (!admin) return false;

  const { error } = await admin
    .from(PASSKEY_CREDENTIALS_TABLE)
    .update({
      counter: nextCounter,
      updated_at: new Date().toISOString(),
    })
    .eq('email', normalizeEmail(email))
    .eq('credential_id', credentialId);

  if (error) {
    console.error('Supabase update credential counter error:', error.message);
    return false;
  }

  return true;
}

async function readStore(): Promise<PasskeyStore> {
  await ensureStore();
  const raw = await fs.readFile(filePath, 'utf8');

  try {
    const parsed = JSON.parse(raw) as PasskeyStore;
    return {
      users: Array.isArray(parsed?.users) ? parsed.users : [],
      challenges: Array.isArray(parsed?.challenges) ? parsed.challenges : [],
    };
  } catch {
    return { users: [], challenges: [] };
  }
}

async function writeStore(store: PasskeyStore): Promise<void> {
  await ensureStore();
  await fs.writeFile(filePath, JSON.stringify(store, null, 2), 'utf8');
}

async function ensureStore(): Promise<void> {
  await fs.mkdir(dataDir, { recursive: true });
  try {
    await fs.access(filePath);
  } catch {
    await fs.writeFile(filePath, JSON.stringify({ users: [], challenges: [] }, null, 2), 'utf8');
  }
}
