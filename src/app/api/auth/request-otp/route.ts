import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST() {
  return NextResponse.json(
    { success: false, error: 'OTP desativado. Utilize autenticacao por Passkey/WebAuthn.' },
    { status: 410 }
  );
}
