import { NextRequest, NextResponse } from 'next/server';
import { consumePasskeyChallenge, getCredentialForUser, getPasskeyUser, updateCredentialCounter } from '@/lib/server/passkey-store';
import { isAllowedOrigin, parseClientData, resolveWebAuthnPolicy, verifyAuthenticatorAssertion } from '@/lib/server/webauthn';
import { createSession } from '@/lib/server/session-store';
import { upsertUserProfile } from '@/lib/server/user-profile-store';

export const runtime = 'nodejs';
const SESSION_MAX_AGE_SECONDS = 60 * 60; // 1 hora

export async function POST(req: NextRequest) {
  try {
    const policy = resolveWebAuthnPolicy({
      originHeader: req.headers.get('origin'),
      hostHeader: req.headers.get('host'),
    });
    const body = await req.json();
    const email = String(body?.email || '').trim().toLowerCase();
    const requestedDisplayName = String(body?.displayName || '').trim();
    const credentialId = String(body?.credentialId || '');
    const clientDataJson = String(body?.clientDataJson || '');
    const authenticatorData = String(body?.authenticatorData || '');
    const signature = String(body?.signature || '');

    if (!isValidEmail(email)) {
      return NextResponse.json({ success: false, error: 'Email inválido.' }, { status: 400 });
    }

    if (!credentialId || !clientDataJson || !authenticatorData || !signature) {
      return NextResponse.json({ success: false, error: 'Dados incompletos da autenticação.' }, { status: 400 });
    }

    const challenge = await consumePasskeyChallenge(email, 'login');
    if (!challenge) {
      return NextResponse.json({ success: false, error: 'Desafio expirado. Inicie novamente.' }, { status: 400 });
    }

    const parsedClientData = parseClientData(clientDataJson);
    if (parsedClientData.type !== 'webauthn.get') {
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

    const credential = await getCredentialForUser(email, credentialId);
    if (!credential) {
      return NextResponse.json({ success: false, error: 'Credencial não encontrada.' }, { status: 404 });
    }

    const verification = verifyAuthenticatorAssertion({
      credentialPublicKeyPem: credential.publicKeyPem,
      authenticatorDataBase64Url: authenticatorData,
      clientDataJsonBase64Url: clientDataJson,
      signatureBase64Url: signature,
      expectedRpId: challenge.rpId,
      requireUserVerification: true,
    });

    if (!verification.verified) {
      return NextResponse.json(
        { success: false, error: verification.reason || 'Falha na verificação da assinatura.' },
        { status: 401 }
      );
    }

    // Alguns autenticadores retornam signCount=0 sempre.
    // Só aplicamos validação estrita de monotonicidade quando pelo menos um lado é > 0.
    const shouldEnforceCounter = verification.counter > 0 || credential.counter > 0;
    if (shouldEnforceCounter && verification.counter <= credential.counter) {
      return NextResponse.json(
        { success: false, error: 'Counter de assinatura inválido para esta credencial.' },
        { status: 401 }
      );
    }

    await updateCredentialCounter(email, credentialId, verification.counter);
    const passkeyUser = await getPasskeyUser(email);
    const resolvedDisplayName =
      requestedDisplayName ||
      String(passkeyUser?.displayName || '').trim() ||
      email.split('@')[0] ||
      'Investigador';

    const persistedDisplayName = await upsertUserProfile({
      email,
      displayName: resolvedDisplayName,
      markLogin: true,
    });

    const sessionId = await createSession(email, SESSION_MAX_AGE_SECONDS);
    const response = NextResponse.json({ success: true, displayName: persistedDisplayName });
    response.cookies.set('tracelab_session', sessionId, {
      httpOnly: true,
      secure: false, // process.env.NODE_ENV === 'production', // FIXME: Revertir para production quando HTTPS estiver configurado
      sameSite: 'lax',
      path: '/',
      maxAge: SESSION_MAX_AGE_SECONDS,
    });
    response.cookies.set('tracelab_user_name', persistedDisplayName, {
      httpOnly: false,
      secure: false, // process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30,
    });

    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Falha ao validar login com passkey.';
    return NextResponse.json(
      {
        success: false,
        error: process.env.NODE_ENV === 'production' ? 'Falha ao validar login com passkey.' : message,
      },
      { status: 500 }
    );
  }
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
