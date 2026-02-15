import { promises as fs } from 'fs';
import path from 'path';

type ToolKey = 'metadata' | 'steganography' | 'ela' | 'scanner' | 'integrity';

export type UserProgress = {
  email: string;
  createdAt: string;
  updatedAt: string;
  totalAnalyses: number;
  metadataScans: number;
  stegoTests: number;
  elaAnalyses: number;
  scannerRuns: number;
  integrityChecks: number;
  challengesCompleted: number;
  totalPoints: number;
  learningScore: number;
  completedChallengeIds: string[];
};

type ProgressStore = {
  users: UserProgress[];
};

const dataDir = path.join(process.cwd(), 'data');
const filePath = path.join(dataDir, 'user-progress.json');

export async function getUserProgress(email: string): Promise<UserProgress> {
  const store = await readStore();
  const normalized = normalizeEmail(email);
  const existing = store.users.find((item) => normalizeEmail(item.email) === normalized);
  if (existing) return existing;

  const now = new Date().toISOString();
  const created: UserProgress = {
    email: normalized,
    createdAt: now,
    updatedAt: now,
    totalAnalyses: 0,
    metadataScans: 0,
    stegoTests: 0,
    elaAnalyses: 0,
    scannerRuns: 0,
    integrityChecks: 0,
    challengesCompleted: 0,
    totalPoints: 0,
    learningScore: 0,
    completedChallengeIds: [],
  };

  store.users.push(created);
  await writeStore(store);
  return created;
}

export async function trackToolUsage(email: string, tool: ToolKey): Promise<UserProgress> {
  const store = await readStore();
  const user = getOrCreateInStore(store, email);

  user.totalAnalyses += 1;
  if (tool === 'metadata') user.metadataScans += 1;
  if (tool === 'steganography') user.stegoTests += 1;
  if (tool === 'ela') user.elaAnalyses += 1;
  if (tool === 'scanner') user.scannerRuns += 1;
  if (tool === 'integrity') user.integrityChecks += 1;

  recomputeLearningScore(user);
  user.updatedAt = new Date().toISOString();
  await writeStore(store);
  return user;
}

export async function completeChallenge(email: string, challengeId: string, points: number): Promise<UserProgress> {
  const store = await readStore();
  const user = getOrCreateInStore(store, email);

  if (!user.completedChallengeIds.includes(challengeId)) {
    user.completedChallengeIds.push(challengeId);
    user.challengesCompleted += 1;
    user.totalPoints += Math.max(0, Math.floor(points));
    recomputeLearningScore(user);
    user.updatedAt = new Date().toISOString();
    await writeStore(store);
  }

  return user;
}

function recomputeLearningScore(user: UserProgress): void {
  const analysisScore = Math.min(70, user.totalAnalyses * 2);
  const challengeScore = Math.min(30, user.challengesCompleted);
  user.learningScore = Math.min(100, analysisScore + challengeScore);
}

function getOrCreateInStore(store: ProgressStore, email: string): UserProgress {
  const normalized = normalizeEmail(email);
  const existing = store.users.find((item) => normalizeEmail(item.email) === normalized);
  if (existing) return existing;

  const now = new Date().toISOString();
  const created: UserProgress = {
    email: normalized,
    createdAt: now,
    updatedAt: now,
    totalAnalyses: 0,
    metadataScans: 0,
    stegoTests: 0,
    elaAnalyses: 0,
    scannerRuns: 0,
    integrityChecks: 0,
    challengesCompleted: 0,
    totalPoints: 0,
    learningScore: 0,
    completedChallengeIds: [],
  };
  store.users.push(created);
  return created;
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

async function readStore(): Promise<ProgressStore> {
  await ensureStore();
  const raw = await fs.readFile(filePath, 'utf8');
  try {
    const parsed = JSON.parse(raw) as ProgressStore;
    return {
      users: Array.isArray(parsed?.users) ? parsed.users : [],
    };
  } catch {
    return { users: [] };
  }
}

async function writeStore(store: ProgressStore): Promise<void> {
  await ensureStore();
  await fs.writeFile(filePath, JSON.stringify(store, null, 2), 'utf8');
}

async function ensureStore(): Promise<void> {
  await fs.mkdir(dataDir, { recursive: true });
  try {
    await fs.access(filePath);
  } catch {
    await fs.writeFile(filePath, JSON.stringify({ users: [] }, null, 2), 'utf8');
  }
}
