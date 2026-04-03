import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { getAuthorizedCustomerId } from '@/lib/api-auth';
import { isMissingTableError } from '@/lib/customer-repository';
import { getShopSupabase } from '@/lib/supabase-server';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const createBodySchema = z.object({
  label: z.string().max(120).optional().nullable(),
  line1: z.string().min(1).max(500),
  line2: z.string().max(500).optional().nullable(),
  city: z.string().max(200).optional().nullable(),
  postalCode: z.string().max(32).optional().nullable(),
  country: z.string().max(120).optional().nullable(),
  isDefault: z.boolean().optional(),
});

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await ctx.params;
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: 'Invalid customer id' }, { status: 400 });
  }

  const auth = await getAuthorizedCustomerId(req, id);
  if (!auth.ok) {
    return NextResponse.json(auth.body, { status: auth.status });
  }

  const db = getShopSupabase();
  if (!db) {
    return NextResponse.json({ error: 'Database not available' }, { status: 503 });
  }

  const { data, error } = await db
    .from('clawd_crm_addresses')
    .select('*')
    .eq('customer_id', id)
    .order('created_at');

  if (error) {
    if (isMissingTableError(error)) {
      return NextResponse.json({ addresses: [] });
    }
    console.error('[onepeace-shop] list addresses failed', { id, message: error.message });
    return NextResponse.json({ error: 'Failed to list addresses' }, { status: 500 });
  }

  const addresses = (data ?? []).map(
    (a: {
      id: string;
      label: string | null;
      line1: string | null;
      line2: string | null;
      city: string | null;
      postal_code: string | null;
      country: string | null;
      is_default: boolean;
      created_at: string;
    }) => ({
      id: a.id,
      label: a.label,
      line1: a.line1,
      line2: a.line2,
      city: a.city,
      postalCode: a.postal_code,
      country: a.country,
      isDefault: a.is_default,
      createdAt: a.created_at,
    }),
  );

  return NextResponse.json({ addresses });
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await ctx.params;
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: 'Invalid customer id' }, { status: 400 });
  }

  const auth = await getAuthorizedCustomerId(req, id);
  if (!auth.ok) {
    return NextResponse.json(auth.body, { status: auth.status });
  }

  let parsed: z.infer<typeof createBodySchema>;
  try {
    parsed = createBodySchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
  }

  const db = getShopSupabase();
  if (!db) {
    return NextResponse.json({ error: 'Database not available' }, { status: 503 });
  }

  const isDefault = parsed.isDefault === true;

  if (isDefault) {
    const { error: uErr } = await db
      .from('clawd_crm_addresses')
      .update({ is_default: false })
      .eq('customer_id', id);
    if (uErr) {
      console.error('[onepeace-shop] reset default addresses failed', { id, message: uErr.message });
      return NextResponse.json({ error: 'Failed to save address' }, { status: 500 });
    }
  }

  const { data, error } = await db
    .from('clawd_crm_addresses')
    .insert({
      customer_id: id,
      label: parsed.label ?? null,
      line1: parsed.line1,
      line2: parsed.line2 ?? null,
      city: parsed.city ?? null,
      postal_code: parsed.postalCode ?? null,
      country: parsed.country ?? null,
      is_default: isDefault,
    })
    .select()
    .maybeSingle();

  if (error) {
    console.error('[onepeace-shop] insert address failed', { id, message: error.message });
    return NextResponse.json({ error: 'Failed to create address' }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: 'Failed to create address' }, { status: 500 });
  }

  const a = data as {
    id: string;
    label: string | null;
    line1: string | null;
    line2: string | null;
    city: string | null;
    postal_code: string | null;
    country: string | null;
    is_default: boolean;
    created_at: string;
  };

  return NextResponse.json({
    address: {
      id: a.id,
      label: a.label,
      line1: a.line1,
      line2: a.line2,
      city: a.city,
      postalCode: a.postal_code,
      country: a.country,
      isDefault: a.is_default,
      createdAt: a.created_at,
    },
  });
}
