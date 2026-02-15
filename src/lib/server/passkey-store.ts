import { promises as fs } from 'fs';
import path from 'path';

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

export async function getPasskeyUser(email: string): Promise<PasskeyUserRecord | null> {
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
  const user = await getPasskeyUser(email);
  if (!user) return [];
  return user.credentials.map((credential) => ({
    id: credential.id,
    transports: credential.transports || [],
  }));
}

export async function getCredentialForUser(email: string, credentialId: string): Promise<PasskeyCredentialRecord | null> {
  const user = await getPasskeyUser(email);
  if (!user) return null;
  return user.credentials.find((credential) => credential.id === credentialId) || null;
}

export async function updateCredentialCounter(email: string, credentialId: string, nextCounter: number): Promise<void> {
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
