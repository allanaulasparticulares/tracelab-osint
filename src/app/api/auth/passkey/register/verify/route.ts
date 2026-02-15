import { NextRequest, NextResponse } from 'next/server';
import { consumePasskeyChallenge, upsertPasskeyCredential } from '@/lib/server/passkey-store';
import { isAllowedOrigin, parseClientData, resolveWebAuthnPolicy, spkiBase64ToPem } from '@/lib/server/webauthn';
import { upsertUserProfile } from '@/lib/server/user-profile-store';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const policy = resolveWebAuthnPolicy({
      originHeader: req.headers.get('origin'),
      hostHeader: req.headers.get('host'),
    });
    const body = await req.json();
    const email = String(body?.email || '').trim().toLowerCase();
    const displayName = String(body?.displayName || '').trim() || email;
    const credentialId = String(body?.credentialId || '');
    const publicKeySpki = String(body?.publicKeySpki || '');
    const algorithm = Number(body?.algorithm);
    const transports = Array.isArray(body?.transports)
      ? body.transports.filter((item: unknown) => typeof item === 'string')
      : [];
    const clientDataJson = String(body?.clientDataJson || '');

    if (!isValidEmail(email)) {
      return NextResponse.json({ success: false, error: 'Email inválido.' }, { status: 400 });
    }

    if (!credentialId || !publicKeySpki || !clientDataJson || Number.isNaN(algorithm)) {
      return NextResponse.json({ success: false, error: 'Dados incompletos do autenticador.' }, { status: 400 });
    }

    const challenge = await consumePasskeyChallenge(email, 'register');
    if (!challenge) {
      return NextResponse.json({ success: false, error: 'Desafio expirado. Gere um novo registro.' }, { status: 400 });
    }

    const parsedClientData = parseClientData(clientDataJson);
    if (parsedClientData.type !== 'webauthn.create') {
      return NextResponse.json({ success: false, error: 'Tipo de operação inválido.' }, { status: 400 });
    }

    if (parsedClientData.challenge !== challenge.challenge) {
      return NextResponse.json({ success: false, error: 'Challenge inválido.' }, { status: 400 });
    }

    if (!isAllowedOrigin(parsedClientData.origin, policy)) {
      return NextResponse.json({ success: false, error: 'Origin não permitida para WebAuthn.' }, { status: 400 });
    }

    if (parsedClientData.origin !== challenge.origin || challenge.rpId !== policy.rpId) {
      return NextResponse.json({ success: false, error: 'Challenge incompatível com a política atual.' }, { status: 400 });
    }

    await upsertPasskeyCredential({
      email,
      displayName,
      credentialId,
      publicKeyPem: spkiBase64ToPem(publicKeySpki),
      algorithm,
      transports,
    });
    await upsertUserProfile({ email, displayName });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false, error: 'Falha ao registrar passkey.' }, { status: 500 });
  }
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
