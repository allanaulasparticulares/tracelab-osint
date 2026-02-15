import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';

type OtpRecord = {
  email: string;
  otpHash: string;
  salt: string;
  expiresAt: string;
  attempts: number;
  requestedAt: string;
};

const dataDir = path.join(process.cwd(), 'data');
const otpFile = path.join(dataDir, 'email-otp.json');

export async function generateAndStoreOtp(email: string, ttlMinutes: number): Promise<string> {
  const otp = generateOtp(6);
  const salt = crypto.randomBytes(16).toString('hex');
  const otpHash = hashOtp(otp, salt);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + ttlMinutes * 60 * 1000);

  const records = await readRecords();
  const next = records.filter((r) => normalizeEmail(r.email) !== normalizeEmail(email));
  next.push({
    email: normalizeEmail(email),
    otpHash,
    salt,
    expiresAt: expiresAt.toISOString(),
    attempts: 0,
    requestedAt: now.toISOString()
  });

  await writeRecords(next);
  return otp;
}

export async function getOtpRecord(email: string): Promise<OtpRecord | null> {
  const records = await readRecords();
  return records.find((r) => normalizeEmail(r.email) === normalizeEmail(email)) || null;
}

export async function verifyOtp(email: string, otp: string, maxAttempts = 5): Promise<{ ok: boolean; reason?: string }> {
  const records = await readRecords();
  const idx = records.findIndex((r) => normalizeEmail(r.email) === normalizeEmail(email));
  if (idx === -1) return { ok: false, reason: 'OTP não encontrado.' };

  const record = records[idx];
  if (new Date(record.expiresAt).getTime() < Date.now()) {
    records.splice(idx, 1);
    await writeRecords(records);
    return { ok: false, reason: 'OTP expirado.' };
  }

  if (record.attempts >= maxAttempts) {
    records.splice(idx, 1);
    await writeRecords(records);
    return { ok: false, reason: 'Limite de tentativas excedido.' };
  }

  const incoming = hashOtp(otp, record.salt);
  const valid = timingSafeEquals(record.otpHash, incoming);

  if (!valid) {
    record.attempts += 1;
    records[idx] = record;
    await writeRecords(records);
    return { ok: false, reason: 'Código inválido.' };
  }

  records.splice(idx, 1);
  await writeRecords(records);
  return { ok: true };
}

function generateOtp(digits: number): string {
  const min = 10 ** (digits - 1);
  const max = 10 ** digits;
  return String(crypto.randomInt(min, max));
}

function hashOtp(otp: string, salt: string): string {
  return crypto.createHash('sha256').update(`${otp}:${salt}`).digest('hex');
}

function timingSafeEquals(a: string, b: string): boolean {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) return false;
  return crypto.timingSafeEqual(aBuf, bBuf);
}

async function readRecords(): Promise<OtpRecord[]> {
  await ensureStore();
  const raw = await fs.readFile(otpFile, 'utf8');
  try {
    const parsed = JSON.parse(raw) as OtpRecord[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeRecords(records: OtpRecord[]) {
  await ensureStore();
  await fs.writeFile(otpFile, JSON.stringify(records, null, 2), 'utf8');
}

async function ensureStore() {
  await fs.mkdir(dataDir, { recursive: true });
  try {
    await fs.access(otpFile);
  } catch {
    await fs.writeFile(otpFile, '[]', 'utf8');
  }
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
