import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const SESSION_COOKIE = 'tracelab_session';
const SESSION_PING_PATH = '/api/auth/session/ping';

function buildLoginRedirect(request: NextRequest): NextResponse {
  const loginUrl = new URL('/login', request.url);
  loginUrl.searchParams.set('next', request.nextUrl.pathname);
  return NextResponse.redirect(loginUrl);
}

function buildExpiredSessionRedirect(request: NextRequest): NextResponse {
  const response = buildLoginRedirect(request);
  response.cookies.set(SESSION_COOKIE, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
  return response;
}

export async function middleware(request: NextRequest) {
  const sessionId = request.cookies.get(SESSION_COOKIE)?.value;

  if (!sessionId) {
    return buildLoginRedirect(request);
  }

  try {
    const sessionPingUrl = new URL(SESSION_PING_PATH, request.url);
    const pingResponse = await fetch(sessionPingUrl, {
      method: 'POST',
      headers: {
        cookie: request.headers.get('cookie') ?? '',
      },
      cache: 'no-store',
    });

    if (!pingResponse.ok) {
      return buildExpiredSessionRedirect(request);
    }
  } catch {
    return buildExpiredSessionRedirect(request);
  }

  const response = NextResponse.next();
  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  response.headers.set('Pragma', 'no-cache');
  response.headers.set('Expires', '0');
  return response;
}

export const config = {
  matcher: [
    '/lab',
    '/lab/:path*',
    '/dashboard',
    '/dashboard/:path*',
    '/challenges',
    '/challenges/:path*',
    '/privacy',
    '/privacy/:path*',
    '/theme',
    '/theme/:path*',
  ],
};
