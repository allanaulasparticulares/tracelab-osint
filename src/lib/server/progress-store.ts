import { promises as fs } from 'fs';
import path from 'path';
import { getSupabaseAdmin } from '@/lib/server/supabase-admin';

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

type SupabaseProgressRow = {
  email: string;
  created_at: string;
  updated_at: string;
  total_analyses: number;
  metadata_scans: number;
  stego_tests: number;
  ela_analyses: number;
  scanner_runs: number;
  integrity_checks: number;
  challenges_completed: number;
  total_points: number;
  learning_score: number;
  completed_challenge_ids: unknown;
};

const SUPABASE_PROGRESS_TABLE = 'app_user_progress';
const dataDir = path.join(process.cwd(), 'data');
const filePath = path.join(dataDir, 'user-progress.json');

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function defaultUserProgress(email: string): UserProgress {
  const now = new Date().toISOString();
  return {
    email: normalizeEmail(email),
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
}

function parseChallengeIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string');
}

function toUserProgress(row: SupabaseProgressRow): UserProgress {
  return {
    email: normalizeEmail(row.email),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    totalAnalyses: Number(row.total_analyses || 0),
    metadataScans: Number(row.metadata_scans || 0),
    stegoTests: Number(row.stego_tests || 0),
    elaAnalyses: Number(row.ela_analyses || 0),
    scannerRuns: Number(row.scanner_runs || 0),
    integrityChecks: Number(row.integrity_checks || 0),
    challengesCompleted: Number(row.challenges_completed || 0),
    totalPoints: Number(row.total_points || 0),
    learningScore: Number(row.learning_score || 0),
    completedChallengeIds: parseChallengeIds(row.completed_challenge_ids),
  };
}

function toSupabaseRow(progress: UserProgress): Omit<SupabaseProgressRow, 'completed_challenge_ids'> & {
  completed_challenge_ids: string[];
} {
  return {
    email: normalizeEmail(progress.email),
    created_at: progress.createdAt,
    updated_at: progress.updatedAt,
    total_analyses: progress.totalAnalyses,
    metadata_scans: progress.metadataScans,
    stego_tests: progress.stegoTests,
    ela_analyses: progress.elaAnalyses,
    scanner_runs: progress.scannerRuns,
    integrity_checks: progress.integrityChecks,
    challenges_completed: progress.challengesCompleted,
    total_points: progress.totalPoints,
    learning_score: progress.learningScore,
    completed_challenge_ids: progress.completedChallengeIds,
  };
}

function recomputeLearningScore(user: UserProgress): void {
  const analysisScore = Math.min(70, user.totalAnalyses * 2);
  const challengeScore = Math.min(30, user.challengesCompleted);
  user.learningScore = Math.min(100, analysisScore + challengeScore);
}

async function getSupabaseProgress(email: string): Promise<UserProgress | null> {
  const admin = getSupabaseAdmin();
  if (!admin) return null;

  const normalizedEmail = normalizeEmail(email);
  const { data, error } = await admin
    .from(SUPABASE_PROGRESS_TABLE)
    .select('*')
    .eq('email', normalizedEmail)
    .maybeSingle();

  if (error) {
    throw new Error(`Supabase progress query error: ${error.message}`);
  }

  if (!data) {
    const created = defaultUserProgress(normalizedEmail);
    const { data: inserted, error: insertError } = await admin
      .from(SUPABASE_PROGRESS_TABLE)
      .upsert(toSupabaseRow(created), { onConflict: 'email' })
      .select('*')
      .single();

    if (insertError) {
      throw new Error(`Supabase progress insert error: ${insertError.message}`);
    }
    return toUserProgress(inserted as SupabaseProgressRow);
  }

  return toUserProgress(data as SupabaseProgressRow);
}

async function saveSupabaseProgress(progress: UserProgress): Promise<UserProgress> {
  const admin = getSupabaseAdmin();
  if (!admin) {
    throw new Error('Supabase não configurado.');
  }

  const { data, error } = await admin
    .from(SUPABASE_PROGRESS_TABLE)
    .upsert(toSupabaseRow(progress), { onConflict: 'email' })
    .select('*')
    .single();

  if (error) {
    throw new Error(`Supabase progress upsert error: ${error.message}`);
  }

  return toUserProgress(data as SupabaseProgressRow);
}

export async function getUserProgress(email: string): Promise<UserProgress> {
  try {
    const fromSupabase = await getSupabaseProgress(email);
    if (fromSupabase) return fromSupabase;
  } catch (error) {
    console.error(error);
  }

  return getUserProgressLocal(email);
}

export async function trackToolUsage(email: string, tool: ToolKey): Promise<UserProgress> {
  try {
    const progress = (await getSupabaseProgress(email)) || defaultUserProgress(email);

    progress.totalAnalyses += 1;
    if (tool === 'metadata') progress.metadataScans += 1;
    if (tool === 'steganography') progress.stegoTests += 1;
    if (tool === 'ela') progress.elaAnalyses += 1;
    if (tool === 'scanner') progress.scannerRuns += 1;
    if (tool === 'integrity') progress.integrityChecks += 1;

    progress.updatedAt = new Date().toISOString();
    recomputeLearningScore(progress);
    return saveSupabaseProgress(progress);
  } catch (error) {
    console.error(error);
  }

  return trackToolUsageLocal(email, tool);
}

export async function completeChallenge(email: string, challengeId: string, points: number): Promise<UserProgress> {
  try {
    const progress = (await getSupabaseProgress(email)) || defaultUserProgress(email);

    if (!progress.completedChallengeIds.includes(challengeId)) {
      progress.completedChallengeIds.push(challengeId);
      progress.challengesCompleted += 1;
      progress.totalPoints += Math.max(0, Math.floor(points));
      progress.updatedAt = new Date().toISOString();
      recomputeLearningScore(progress);
      return saveSupabaseProgress(progress);
    }

    return progress;
  } catch (error) {
    console.error(error);
  }

  return completeChallengeLocal(email, challengeId, points);
}

async function getUserProgressLocal(email: string): Promise<UserProgress> {
  const store = await readStore();
  const normalized = normalizeEmail(email);
  const existing = store.users.find((item) => normalizeEmail(item.email) === normalized);
  if (existing) return existing;

  const created = defaultUserProgress(normalized);
  store.users.push(created);
  await writeStore(store);
  return created;
}

async function trackToolUsageLocal(email: string, tool: ToolKey): Promise<UserProgress> {
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

async function completeChallengeLocal(email: string, challengeId: string, points: number): Promise<UserProgress> {
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

function getOrCreateInStore(store: ProgressStore, email: string): UserProgress {
  const normalized = normalizeEmail(email);
  const existing = store.users.find((item) => normalizeEmail(item.email) === normalized);
  if (existing) return existing;

  const created = defaultUserProgress(normalized);
  store.users.push(created);
  return created;
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
