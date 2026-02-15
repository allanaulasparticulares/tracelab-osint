import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/server/session-store';
import { trackToolUsage } from '@/lib/server/progress-store';

export const runtime = 'nodejs';

const SESSION_COOKIE = 'tracelab_session';
const ALLOWED_TOOLS = new Set(['metadata', 'steganography', 'ela', 'scanner', 'integrity']);

export async function POST(req: NextRequest) {
  const sessionId = req.cookies.get(SESSION_COOKIE)?.value;
  if (!sessionId) {
    return NextResponse.json({ success: false, error: 'Não autenticado.' }, { status: 401 });
  }

  const session = await getSession(sessionId);
  if (!session) {
    return NextResponse.json({ success: false, error: 'Sessão inválida.' }, { status: 401 });
  }

  const body = await req.json();
  const tool = String(body?.tool || '').trim();
  if (!ALLOWED_TOOLS.has(tool)) {
    return NextResponse.json({ success: false, error: 'Ferramenta inválida.' }, { status: 400 });
  }

  const progress = await trackToolUsage(
    session.email,
    tool as 'metadata' | 'steganography' | 'ela' | 'scanner' | 'integrity'
  );

  return NextResponse.json({ success: true, progress });
}
