import { NextRequest, NextResponse } from 'next/server';
import { revokeSession } from '@/lib/server/session-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SESSION_COOKIE = 'tracelab_session';

function buildLogoutResponse(req: NextRequest): NextResponse {
  const url = new URL('/login', req.url);
  const response = NextResponse.redirect(url);
  response.cookies.set(SESSION_COOKIE, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
  return response;
}

async function handleLogout(req: NextRequest): Promise<NextResponse> {
  const session = req.cookies.get(SESSION_COOKIE)?.value;
  if (session) {
    try {
      await revokeSession(session);
    } catch (error) {
      console.error('Logout revokeSession error:', error);
    }
  }

  return buildLogoutResponse(req);
}

export async function GET(req: NextRequest) {
  return handleLogout(req);
}

export async function POST(req: NextRequest) {
  return handleLogout(req);
}
