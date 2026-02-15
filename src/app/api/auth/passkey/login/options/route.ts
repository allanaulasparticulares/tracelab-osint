import { NextRequest, NextResponse } from 'next/server';
import { getPasskeyUser, listCredentialDescriptors, setPasskeyChallenge } from '@/lib/server/passkey-store';
import { generateChallenge, resolveWebAuthnPolicy } from '@/lib/server/webauthn';

export const runtime = 'nodejs';

const CHALLENGE_TTL_MS = 5 * 60 * 1000;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = String(body?.email || '').trim().toLowerCase();

    if (!isValidEmail(email)) {
      return NextResponse.json({ success: false, error: 'Email inválido.' }, { status: 400 });
    }

    const user = await getPasskeyUser(email);
    if (!user || user.credentials.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Nenhuma passkey cadastrada para este email.' },
        { status: 404 }
      );
    }

    const challenge = generateChallenge();
    const policy = resolveWebAuthnPolicy({
      originHeader: req.headers.get('origin'),
      hostHeader: req.headers.get('host'),
    });
    const credentials = await listCredentialDescriptors(email);

    await setPasskeyChallenge({
      email,
      type: 'login',
      challenge,
      rpId: policy.rpId,
      origin: policy.expectedOrigin,
      ttlMs: CHALLENGE_TTL_MS,
    });

    return NextResponse.json({
      success: true,
      userDisplayName: user.displayName || email,
      publicKey: {
        challenge,
        timeout: 60000,
        rpId: policy.rpId,
        userVerification: 'required',
        allowCredentials: credentials.map((credential) => ({
          id: credential.id,
          type: 'public-key',
          transports: credential.transports,
        })),
      },
    });
  } catch {
    return NextResponse.json({ success: false, error: 'Falha ao iniciar login com passkey.' }, { status: 500 });
  }
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
