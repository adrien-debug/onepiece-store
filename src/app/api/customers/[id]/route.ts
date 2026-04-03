import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { getAuthorizedCustomerId } from '@/lib/api-auth';
import { loadCustomerDetail } from '@/lib/customer-repository';
import { getShopSupabase } from '@/lib/supabase-server';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const updateBodySchema = z.object({
  name: z.string().min(1).max(500).optional(),
  email: z.string().email().max(320).optional(),
  phone: z.string().max(50).optional().nullable(),
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

  const result = await loadCustomerDetail(db, id);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({
    customer: result.customer,
    ordersSummary: result.ordersSummary,
    orders: result.orders,
    addresses: result.addresses,
  });
}

export async function PUT(
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

  const payload: Record<string, unknown> = {};
  if (parsed.name !== undefined) payload.name = parsed.name;
  if (parsed.email !== undefined) payload.email = parsed.email.trim().toLowerCase();
  if (parsed.phone !== undefined) payload.phone = parsed.phone;

  const { data, error } = await db
    .from('clawd_crm_customers')
    .update(payload)
    .eq('id', id)
    .select()
    .maybeSingle();

  if (error) {
    console.error('[onepeace-shop] PUT customer failed', { id, message: error.message, code: error.code });
    return NextResponse.json({ error: 'Failed to update customer' }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
  }

  const row = data as {
    id: string;
    email: string;
    name: string | null;
    phone: string | null;
    notes: string | null;
    signup_at: string;
    created_at: string;
    updated_at: string;
  };

  return NextResponse.json({
    customer: {
      id: row.id,
      email: row.email,
      name: row.name,
      phone: row.phone,
      notes: row.notes,
      signupAt: row.signup_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    },
  });
}
