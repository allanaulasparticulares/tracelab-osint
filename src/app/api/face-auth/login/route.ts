import { NextRequest, NextResponse } from 'next/server';
import { cosineSimilarity, isValidDescriptor, normalizeName } from '@/lib/face/descriptor';
import { findFaceUserByName } from '@/lib/server/face-auth-store';

export const runtime = 'nodejs';

const LOGIN_THRESHOLD = 0.9;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const name = normalizeName(String(body?.name || ''));
    const descriptor = body?.descriptor;

    if (name.length < 2) {
      return NextResponse.json({ success: false, error: 'Nome inválido.' }, { status: 400 });
    }

    if (!isValidDescriptor(descriptor)) {
      return NextResponse.json({ success: false, error: 'Descriptor facial inválido.' }, { status: 400 });
    }

    const user = await findFaceUserByName(name);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Usuário não encontrado.' }, { status: 404 });
    }

    const similarity = cosineSimilarity(user.descriptor, descriptor);
    if (similarity < LOGIN_THRESHOLD) {
      return NextResponse.json(
        {
          success: false,
          error: `Reconhecimento não validado (${(similarity * 100).toFixed(1)}%).`,
          similarity
        },
        { status: 401 }
      );
    }

    return NextResponse.json({ success: true, similarity });
  } catch {
    return NextResponse.json({ success: false, error: 'Falha no login facial.' }, { status: 500 });
  }
}
