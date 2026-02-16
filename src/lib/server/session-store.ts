import crypto from 'crypto';

export type SessionRecord = {
  id: string;
  email: string;
  createdAt: string;
  lastActivityAt: string;
  expiresAt: string;
};

// Segredo para assinar o cookie. Usamos preferencialmente a SERVICE_KEY.
const SECRET_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SESSION_SECRET || 'default-insecure-secret-dev-only';

if (SECRET_KEY === 'default-insecure-secret-dev-only' && process.env.NODE_ENV === 'production') {
  console.error('❌ CRITICAL SECURITY ERROR: No session secret defined in production! Authentication is vulnerable.');
}

export async function createSession(email: string, ttlSeconds: number): Promise<string> {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + ttlSeconds * 1000);

  const payload: SessionRecord = {
    id: crypto.randomUUID(),
    email: normalizeEmail(email),
    createdAt: now.toISOString(),
    lastActivityAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
  };

  return signSession(payload);
}

export async function getSession(token: string): Promise<SessionRecord | null> {
  if (!token) return null;
  const session = verifySession(token);
  if (!session) return null;

  if (new Date(session.expiresAt).getTime() <= Date.now()) {
    return null;
  }

  return session;
}

// Em stateless, "touch" significa gerar um novo token com nova expiração.
// Como não podemos atualizar o cookie aqui facilmente sem acesso a Response,
// apenas retornamos o objeto atualizado para quem chamar (middleware) re-setar o cookie.
export async function touchSession(token: string, ttlSeconds: number): Promise<string | null> {
  const session = await getSession(token);
  if (!session) return null;

  const now = new Date();
  const nextExpires = new Date(now.getTime() + ttlSeconds * 1000);

  const updated: SessionRecord = {
    ...session,
    lastActivityAt: now.toISOString(),
    expiresAt: nextExpires.toISOString(),
  };

  return signSession(updated);
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function revokeSession(_token: string): Promise<void> {
  // Em stateless, não podemos revogar tokens sem blacklist.
  // Para este app, vamos confiar na expiração curta.
  // O cliente deve apagar o cookie.
  return;
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

// --- Helpers de Assinatura (HMAC SHA-256) ---

function signSession(payload: SessionRecord): string {
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', SECRET_KEY)
    .update(data)
    .digest('base64url');

  return `${data}.${signature}`;
}

function verifySession(token: string): SessionRecord | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 2) return null;

    const [data, signature] = parts;

    const expectedSignature = crypto
      .createHmac('sha256', SECRET_KEY)
      .update(data)
      .digest('base64url');

    // Timing safe compare
    const a = Buffer.from(signature);
    const b = Buffer.from(expectedSignature);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      return null;
    }

    const payload = JSON.parse(Buffer.from(data, 'base64url').toString('utf-8')) as SessionRecord;
    return payload;
  } catch {
    return null;
  }
}

