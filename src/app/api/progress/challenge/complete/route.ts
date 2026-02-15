import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/server/session-store';
import { completeChallenge } from '@/lib/server/progress-store';

export const runtime = 'nodejs';

const SESSION_COOKIE = 'tracelab_session';

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
  const challengeId = String(body?.challengeId || '').trim();
  const points = Number(body?.points ?? 0);

  if (!challengeId) {
    return NextResponse.json({ success: false, error: 'challengeId obrigatório.' }, { status: 400 });
  }

  const progress = await completeChallenge(session.email, challengeId, Number.isFinite(points) ? points : 0);
  return NextResponse.json({ success: true, progress });
}
