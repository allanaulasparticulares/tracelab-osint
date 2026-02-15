import { NextRequest, NextResponse } from 'next/server';
import { getPasskeyUser, setPasskeyChallenge } from '@/lib/server/passkey-store';
import { generateChallenge, resolveWebAuthnPolicy } from '@/lib/server/webauthn';

export const runtime = 'nodejs';

const CHALLENGE_TTL_MS = 5 * 60 * 1000;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = String(body?.email || '').trim().toLowerCase();
    const displayName = String(body?.displayName || '').trim() || email;

    if (!isValidEmail(email)) {
      return NextResponse.json({ success: false, error: 'Email inválido.' }, { status: 400 });
    }

    const challenge = generateChallenge();
    const policy = resolveWebAuthnPolicy({
      originHeader: req.headers.get('origin'),
      hostHeader: req.headers.get('host'),
    });
    const user = await getPasskeyUser(email);
    const existingCredentialIds = (user?.credentials || []).map((credential) => credential.id);

    await setPasskeyChallenge({
      email,
      type: 'register',
      challenge,
      rpId: policy.rpId,
      origin: policy.expectedOrigin,
      ttlMs: CHALLENGE_TTL_MS,
    });

    return NextResponse.json({
      success: true,
      publicKey: {
        challenge,
        rp: {
          name: 'TraceLab OSINT',
          id: policy.rpId,
        },
        user: {
          id: Buffer.from(email, 'utf8').toString('base64url'),
          name: email,
          displayName,
        },
        pubKeyCredParams: [
          { type: 'public-key', alg: -7 },
          { type: 'public-key', alg: -257 },
        ],
        timeout: 60000,
        attestation: 'none',
        authenticatorSelection: {
          residentKey: 'preferred',
          userVerification: 'required',
        },
        excludeCredentials: existingCredentialIds.map((id) => ({
          id,
          type: 'public-key',
        })),
      },
    });
  } catch {
    return NextResponse.json({ success: false, error: 'Falha ao iniciar registro de passkey.' }, { status: 500 });
  }
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
