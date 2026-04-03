import { NextResponse } from 'next/server';
import { loginSchema } from '@/lib/auth-schemas';
import { signOnepeaceSessionToken } from '@/lib/session-jwt';
import { createAdminClient } from '@/utils/supabase/admin';

export async function POST(req: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsedBody = loginSchema.safeParse(body);
  if (!parsedBody.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsedBody.error.flatten() },
      { status: 400 },
    );
  }

  const { email, password } = parsedBody.data;
  const supabase = createAdminClient();

  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (authError || !authData.user) {
    console.warn('[api/auth/login] Supabase auth failed:', authError?.message);
    return NextResponse.json(
      { error: authError?.message ?? 'Identifiants invalides' },
      { status: 401 },
    );
  }

  const user = authData.user;
  const name =
    typeof user.user_metadata?.name === 'string' ? user.user_metadata.name : '';

  let token: string;
  try {
    token = await signOnepeaceSessionToken({
      sub: user.id,
      email: user.email ?? email,
      name,
    });
  } catch (err) {
    console.error('[api/auth/login] JWT signing failed:', (err as Error).message);
    return NextResponse.json(
      { error: 'Server misconfiguration (session signing)' },
      { status: 503 },
    );
  }

  return NextResponse.json({
    token,
    userId: user.id,
    customerId: user.id,
    email: user.email ?? email,
    name,
    dashboardAccess: [],
  });
}
