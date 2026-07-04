import { NextResponse } from 'next/server';

export async function GET() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) {
    return NextResponse.json({ error: 'FIREBASE_SERVICE_ACCOUNT is NOT SET' }, { status: 500 });
  }
  try {
    // Test if it's valid JSON
    const parsed = JSON.parse(raw.replace(/\r?\n/g, ''));
    return NextResponse.json({
      exists: true,
      hasPrivateKey: !!parsed.private_key,
      privateKeyLength: parsed.private_key?.length || 0,
      privateKeyStartsWith: parsed.private_key?.substring(0, 30) || '',
      clientEmail: parsed.client_email,
      projectId: parsed.project_id,
    });
  } catch (e: any) {
    return NextResponse.json({
      exists: true,
      parseError: e.message,
      rawLength: raw.length,
      rawFirst100: raw.substring(0, 100),
    }, { status: 500 });
  }
}
