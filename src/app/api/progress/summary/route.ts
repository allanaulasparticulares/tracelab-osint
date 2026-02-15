import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/server/session-store';
import { getUserProgress } from '@/lib/server/progress-store';
import { getUserProfileName } from '@/lib/server/user-profile-store';

export const runtime = 'nodejs';

const SESSION_COOKIE = 'tracelab_session';

export async function GET(req: NextRequest) {
  const sessionId = req.cookies.get(SESSION_COOKIE)?.value;
  if (!sessionId) {
    return NextResponse.json({ success: false, error: 'Não autenticado.' }, { status: 401 });
  }

  const session = await getSession(sessionId);
  if (!session) {
    return NextResponse.json({ success: false, error: 'Sessão inválida.' }, { status: 401 });
  }

  const progress = await getUserProgress(session.email);
  const userName = await getUserProfileName(session.email);
  return NextResponse.json({ success: true, progress, userName });
}
