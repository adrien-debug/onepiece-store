import { NextResponse } from 'next/server';
import { forgotPasswordSchema } from '@/lib/auth-schemas';

/**
 * Placeholder: transactional reset is not wired for the shop yet.
 * Returns a generic success message to avoid e-mail enumeration.
 */
export async function POST(req: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = forgotPasswordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 });
  }

  try {
    return NextResponse.json({
      ok: true,
      message:
        'Si un compte existe pour cette adresse, vous recevrez un e-mail avec les instructions.',
    });
  } catch (err) {
    console.error('[api/auth/forgot-password] error:', (err as Error).message);
    return NextResponse.json({ error: 'Request failed' }, { status: 500 });
  }
}
