import { NextRequest, NextResponse } from 'next/server';
import { isValidDescriptor, normalizeName } from '@/lib/face/descriptor';
import { upsertFaceUser } from '@/lib/server/face-auth-store';

export const runtime = 'nodejs';

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

    await upsertFaceUser(name, descriptor);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false, error: 'Falha ao registrar face.' }, { status: 500 });
  }
}
