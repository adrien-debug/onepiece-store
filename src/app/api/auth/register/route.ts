import { NextResponse } from 'next/server';
import { z } from 'zod';
import { signOnepeaceSessionToken } from '@/lib/session-jwt';
import { createAdminClient } from '@/utils/supabase/admin';

const registerBodySchema = z.object({
  name: z.string().trim().min(1).max(200),
  email: z.string().trim().email().max(255),
  password: z.string().min(8).max(128),
});

export async function POST(req: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = registerBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { name, email, password } = parsed.data;
  const supabase = createAdminClient();

  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { name } },
  });

  if (signUpError) {
    const msg =
      signUpError.message.includes('already registered')
        ? 'Un compte existe déjà avec cet e-mail'
        : signUpError.message;
    console.error('[api/auth/register] Supabase signUp failed:', signUpError.message);
    return NextResponse.json({ error: msg }, { status: 409 });
  }

  const user = signUpData.user;
  if (!user) {
    return NextResponse.json(
      { error: 'Compte créé mais aucun utilisateur retourné' },
      { status: 502 },
    );
  }

  let token: string;
  try {
    token = await signOnepeaceSessionToken({
      sub: user.id,
      email: user.email ?? email,
      name,
    });
  } catch (err) {
    console.error('[api/auth/register] JWT signing failed:', (err as Error).message);
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
