import { promises as fs } from 'fs';
import path from 'path';

export type FaceUserRecord = {
  name: string;
  descriptor: number[];
  createdAt: string;
  updatedAt: string;
};

const dataDir = path.join(process.cwd(), 'data');
const faceUsersFile = path.join(dataDir, 'face-users.json');

export async function getFaceUsers(): Promise<FaceUserRecord[]> {
  await ensureStore();
  const raw = await fs.readFile(faceUsersFile, 'utf8');
  try {
    const parsed = JSON.parse(raw) as FaceUserRecord[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((u) => isValidUser(u));
  } catch {
    return [];
  }
}

export async function upsertFaceUser(name: string, descriptor: number[]): Promise<void> {
  const users = await getFaceUsers();
  const now = new Date().toISOString();
  const normalized = normalizeName(name);

  const next = users.filter((u) => normalizeName(u.name) !== normalized);
  next.push({
    name: normalized,
    descriptor,
    createdAt: now,
    updatedAt: now
  });

  await fs.writeFile(faceUsersFile, JSON.stringify(next, null, 2), 'utf8');
}

export async function findFaceUserByName(name: string): Promise<FaceUserRecord | null> {
  const users = await getFaceUsers();
  const normalized = normalizeName(name);
  return users.find((u) => normalizeName(u.name) === normalized) || null;
}

function normalizeName(value: string): string {
  return value.trim().toLowerCase();
}

function isValidUser(value: unknown): value is FaceUserRecord {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<FaceUserRecord>;
  return (
    typeof candidate.name === 'string' &&
    Array.isArray(candidate.descriptor) &&
    candidate.descriptor.length > 0 &&
    candidate.descriptor.every((n) => typeof n === 'number') &&
    typeof candidate.createdAt === 'string' &&
    typeof candidate.updatedAt === 'string'
  );
}

async function ensureStore() {
  await fs.mkdir(dataDir, { recursive: true });
  try {
    await fs.access(faceUsersFile);
  } catch {
    await fs.writeFile(faceUsersFile, '[]', 'utf8');
  }
}
