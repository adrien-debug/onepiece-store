import { NextResponse, type NextRequest } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';

export async function POST(req: NextRequest) {
  const body = (await req.json()) as { code?: string };
  const code = body.code?.trim().toUpperCase();

  if (!code) {
    return NextResponse.json({ valid: false, error: 'Code manquant' }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('discount_codes')
    .select('*')
    .eq('code', code)
    .eq('active', true)
    .single();

  if (error || !data) {
    return NextResponse.json({ valid: false, error: 'Code invalide' });
  }

  const row = data as Record<string, unknown>;
  if (row.expires_at && new Date(String(row.expires_at)) < new Date()) {
    return NextResponse.json({ valid: false, error: 'Code expiré' });
  }

  return NextResponse.json({
    valid: true,
    discount: {
      code: row.code,
      discountPercent: row.discount_percent ?? null,
      discountCents: row.discount_cents ?? null,
      freeShipping: row.free_shipping ?? false,
    },
  });
}
