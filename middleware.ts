import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const SESSION_COOKIE = 'tracelab_session';
const SECRET_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SESSION_SECRET || 'default-insecure-secret-dev-only';

/**
 * Valida a assinatura HMAC-SHA256 do token usando Web Crypto API (Edge compatible)
 */
async function verifySessionSignature(token: string): Promise<boolean> {
  try {
    const parts = token.split('.');
    if (parts.length !== 2) return false;

    const [data, signature] = parts;
    const encoder = new TextEncoder();

    // Importa a chave (baseada no segredo do servidor)
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(SECRET_KEY),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );

    // Converte a assinatura Base64URL para ArrayBuffer
    const signatureBin = base64UrlToUint8Array(signature);

    // Valida se HMAC(data) === signature
    return await crypto.subtle.verify(
      'HMAC',
      key,
      signatureBin,
      encoder.encode(data)
    );
  } catch {
    return false;
  }
}

function base64UrlToUint8Array(base64Url: string): Uint8Array {
  const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  const padLen = (4 - (base64.length % 4)) % 4;
  const padded = base64 + '='.repeat(padLen);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function buildLoginRedirect(request: NextRequest): NextResponse {
  const loginUrl = new URL('/login', request.url);
  loginUrl.searchParams.set('next', request.nextUrl.pathname);
  return NextResponse.redirect(loginUrl);
}

export async function middleware(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;

  // 1. Verifica existência
  if (!token) {
    return buildLoginRedirect(request);
  }

  // 2. Verifica validade da assinatura (Stateless check no Edge)
  const isValid = await verifySessionSignature(token);
  if (!isValid) {
    console.warn(`[Middleware] Token inválido ou forjado detectado para rota: ${request.nextUrl.pathname}`);
    return buildLoginRedirect(request);
  }

  // 3. Verifica expiração básica (opcional aqui, mas as APIs farão o check profundo)
  try {
    const [payloadBase64] = token.split('.');
    const payload = JSON.parse(atob(payloadBase64.replace(/-/g, '+').replace(/_/g, '/')));
    if (new Date(payload.expiresAt).getTime() <= Date.now()) {
      return buildLoginRedirect(request);
    }
  } catch {
    return buildLoginRedirect(request);
  }

  const response = NextResponse.next();
  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  return response;
}

export const config = {
  matcher: [
    '/lab/:path*',
    '/lab',
    '/dashboard/:path*',
    '/dashboard',
    '/challenges/:path*',
    '/challenges',
    '/privacy',
    '/theme',
  ],
};
