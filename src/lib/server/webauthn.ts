import crypto from 'crypto';
import { base64UrlToBuffer, bufferToBase64Url } from '@/lib/server/base64url';

const CHALLENGE_BYTES = 32;
const LOCAL_ORIGINS = ['http://localhost:3000', 'http://127.0.0.1:3000'];

export type WebAuthnPolicy = {
  rpId: string;
  expectedOrigin: string;
  allowedOrigins: string[];
};

export function generateChallenge(): string {
  return bufferToBase64Url(crypto.randomBytes(CHALLENGE_BYTES));
}

export function resolveRpId(hostHeader: string | null): string {
  if (process.env.WEBAUTHN_RP_ID) return process.env.WEBAUTHN_RP_ID;
  const host = (hostHeader || '').split(':')[0].trim();
  return host || 'localhost';
}

export function resolveOrigin(originHeader: string | null, hostHeader: string | null): string {
  if (process.env.WEBAUTHN_ORIGIN) return process.env.WEBAUTHN_ORIGIN;
  if (originHeader) return originHeader;

  const host = hostHeader || 'localhost:3000';
  const secure = !host.includes('localhost') && !host.startsWith('127.0.0.1');
  return `${secure ? 'https' : 'http'}://${host}`;
}

export function resolveWebAuthnPolicy(input: {
  originHeader: string | null;
  hostHeader: string | null;
}): WebAuthnPolicy {
  const rpId = resolveRpId(input.hostHeader);
  const expectedOrigin = resolveOrigin(input.originHeader, input.hostHeader);
  const allowedOrigins = parseAllowedOrigins(expectedOrigin);

  if (process.env.NODE_ENV === 'production') {
    if (!process.env.WEBAUTHN_RP_ID || !process.env.WEBAUTHN_ORIGIN) {
      throw new Error('Configure WEBAUTHN_RP_ID e WEBAUTHN_ORIGIN em produção.');
    }
  }

  return { rpId, expectedOrigin, allowedOrigins };
}

export function isAllowedOrigin(origin: string, policy: WebAuthnPolicy): boolean {
  return policy.allowedOrigins.includes(origin);
}

export function spkiBase64ToPem(base64Value: string): string {
  const body = toBase64Standard(base64Value.replace(/\s+/g, ''));
  const wrapped = body.match(/.{1,64}/g)?.join('\n') || body;
  return `-----BEGIN PUBLIC KEY-----\n${wrapped}\n-----END PUBLIC KEY-----`;
}

export function normalizePemIfNeeded(pem: string): string {
  const match = pem.match(/-----BEGIN PUBLIC KEY-----([\s\S]*?)-----END PUBLIC KEY-----/);
  if (!match) return pem;

  const rawBody = (match[1] || '').replace(/\s+/g, '');
  const normalizedBody = toBase64Standard(rawBody);
  const wrapped = normalizedBody.match(/.{1,64}/g)?.join('\n') || normalizedBody;
  return `-----BEGIN PUBLIC KEY-----\n${wrapped}\n-----END PUBLIC KEY-----`;
}

export function parseClientData(clientDataBase64Url: string): {
  type: string;
  challenge: string;
  origin: string;
} {
  const decoded = base64UrlToBuffer(clientDataBase64Url).toString('utf8');
  const parsed = JSON.parse(decoded) as { type?: string; challenge?: string; origin?: string };
  return {
    type: parsed.type || '',
    challenge: parsed.challenge || '',
    origin: parsed.origin || '',
  };
}

export function verifyAuthenticatorAssertion(input: {
  credentialPublicKeyPem: string;
  authenticatorDataBase64Url: string;
  clientDataJsonBase64Url: string;
  signatureBase64Url: string;
  expectedRpId: string;
  requireUserVerification?: boolean;
}): { verified: boolean; counter: number; reason?: string } {
  const authData = base64UrlToBuffer(input.authenticatorDataBase64Url);
  const clientDataJson = base64UrlToBuffer(input.clientDataJsonBase64Url);
  const signature = base64UrlToBuffer(input.signatureBase64Url);

  if (authData.length < 37) {
    return { verified: false, counter: 0, reason: 'authenticatorData inválido.' };
  }

  const rpIdHash = authData.subarray(0, 32);
  const expectedRpIdHash = crypto.createHash('sha256').update(input.expectedRpId).digest();
  if (!rpIdHash.equals(expectedRpIdHash)) {
    return { verified: false, counter: 0, reason: 'rpIdHash não confere.' };
  }

  const flags = authData[32];
  const userPresent = (flags & 0x01) !== 0;
  const userVerified = (flags & 0x04) !== 0;
  if (!userPresent) {
    return { verified: false, counter: 0, reason: 'Usuário não presente no autenticador.' };
  }

  if (input.requireUserVerification && !userVerified) {
    return { verified: false, counter: 0, reason: 'Verificação biométrica/PIN não confirmada.' };
  }

  const counter = authData.readUInt32BE(33);
  const clientDataHash = crypto.createHash('sha256').update(clientDataJson).digest();
  const signedPayload = Buffer.concat([authData, clientDataHash]);

  const publicKeyPem = normalizePemIfNeeded(input.credentialPublicKeyPem);
  const verified = crypto.verify('sha256', signedPayload, publicKeyPem, signature);
  if (!verified) {
    return { verified: false, counter, reason: 'Assinatura inválida.' };
  }

  return { verified: true, counter };
}

function toBase64Standard(value: string): string {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padLength = (4 - (normalized.length % 4 || 4)) % 4;
  return normalized + '='.repeat(padLength);
}

function parseAllowedOrigins(expectedOrigin: string): string[] {
  const fromEnv = (process.env.WEBAUTHN_ALLOWED_ORIGINS || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

  const base = Array.from(new Set([expectedOrigin, ...fromEnv]));
  if (process.env.NODE_ENV !== 'production') {
    return Array.from(new Set([...base, ...LOCAL_ORIGINS]));
  }

  return base;
}
