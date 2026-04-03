import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { getAuthorizedCustomerId } from '@/lib/api-auth';
import { getShopSupabase } from '@/lib/supabase-server';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const updateBodySchema = z.object({
  label: z.string().max(120).optional().nullable(),
  line1: z.string().min(1).max(500).optional(),
  line2: z.string().max(500).optional().nullable(),
  city: z.string().max(200).optional().nullable(),
  postalCode: z.string().max(32).optional().nullable(),
  country: z.string().max(120).optional().nullable(),
  isDefault: z.boolean().optional(),
});

export async function PUT(
  req: NextRequest,
  ctx: { params: Promise<{ id: string; addressId: string }> },
): Promise<NextResponse> {
  const { id, addressId } = await ctx.params;
  if (!UUID_RE.test(id) || !UUID_RE.test(addressId)) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
  }

  const auth = await getAuthorizedCustomerId(req, id);
  if (!auth.ok) {
    return NextResponse.json(auth.body, { status: auth.status });
  }

  let parsed: z.infer<typeof updateBodySchema>;
  try {
    parsed = updateBodySchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
  }

  if (Object.keys(parsed).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
  }

  const db = getShopSupabase();
  if (!db) {
    return NextResponse.json({ error: 'Database not available' }, { status: 503 });
  }

  const { data: existing, error: exErr } = await db
    .from('clawd_crm_addresses')
    .select('id')
    .eq('id', addressId)
    .eq('customer_id', id)
    .maybeSingle();

  if (exErr) {
    console.error('[onepeace-shop] address lookup failed', { addressId, message: exErr.message });
    return NextResponse.json({ error: 'Failed to update address' }, { status: 500 });
  }
  if (!existing) {
    return NextResponse.json({ error: 'Address not found' }, { status: 404 });
  }

  if (parsed.isDefault === true) {
    const { error: uErr } = await db
      .from('clawd_crm_addresses')
      .update({ is_default: false })
      .eq('customer_id', id);
    if (uErr) {
      console.error('[onepeace-shop] reset default addresses failed', { id, message: uErr.message });
      return NextResponse.json({ error: 'Failed to update address' }, { status: 500 });
    }
  }

  const payload: Record<string, unknown> = {};
  if (parsed.label !== undefined) payload.label = parsed.label;
  if (parsed.line1 !== undefined) payload.line1 = parsed.line1;
  if (parsed.line2 !== undefined) payload.line2 = parsed.line2;
  if (parsed.city !== undefined) payload.city = parsed.city;
  if (parsed.postalCode !== undefined) payload.postal_code = parsed.postalCode;
  if (parsed.country !== undefined) payload.country = parsed.country;
  if (parsed.isDefault !== undefined) payload.is_default = parsed.isDefault;

  const { data, error } = await db
    .from('clawd_crm_addresses')
    .update(payload)
    .eq('id', addressId)
    .eq('customer_id', id)
    .select()
    .maybeSingle();

  if (error) {
    console.error('[onepeace-shop] update address failed', { addressId, message: error.message });
    return NextResponse.json({ error: 'Failed to update address' }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: 'Address not found' }, { status: 404 });
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

export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ id: string; addressId: string }> },
): Promise<NextResponse> {
  const { id, addressId } = await ctx.params;
  if (!UUID_RE.test(id) || !UUID_RE.test(addressId)) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
  }

  const auth = await getAuthorizedCustomerId(req, id);
  if (!auth.ok) {
    return NextResponse.json(auth.body, { status: auth.status });
  }

  const db = getShopSupabase();
  if (!db) {
    return NextResponse.json({ error: 'Database not available' }, { status: 503 });
  }

  const { data: deleted, error } = await db
    .from('clawd_crm_addresses')
    .delete()
    .eq('id', addressId)
    .eq('customer_id', id)
    .select('id');

  if (error) {
    console.error('[onepeace-shop] delete address failed', { addressId, message: error.message });
    return NextResponse.json({ error: 'Failed to delete address' }, { status: 500 });
  }

  if (!deleted?.length) {
    return NextResponse.json({ error: 'Address not found' }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
