import { NextRequest, NextResponse } from 'next/server';
import { touchSession } from '@/lib/server/session-store';

export const runtime = 'nodejs';

const SESSION_COOKIE = 'tracelab_session';
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 dias

export async function POST(req: NextRequest) {
  const session = req.cookies.get(SESSION_COOKIE)?.value;
  if (!session) {
    return NextResponse.json({ success: false, error: 'Sessão inexistente.' }, { status: 401 });
  }

  const newToken = await touchSession(session, SESSION_MAX_AGE_SECONDS);
  if (!newToken) {
    const expiredResponse = NextResponse.json({ success: false, error: 'Sessão expirada.' }, { status: 401 });
    return expiredResponse;
  }

  const response = NextResponse.json({ success: true });
  response.cookies.set(SESSION_COOKIE, newToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE_SECONDS,
  });

  return response;
}
