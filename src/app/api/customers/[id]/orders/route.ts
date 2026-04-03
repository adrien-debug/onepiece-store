import { NextResponse, type NextRequest } from 'next/server';
import { getAuthorizedCustomerId } from '@/lib/api-auth';
import { isMissingTableError } from '@/lib/customer-repository';
import { getShopSupabase } from '@/lib/supabase-server';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface OrderRow {
  id: string;
  amount_total: string | number;
  currency: string;
  status: string;
  external_ref: string | null;
  placed_at: string;
  created_at: string;
}

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

  const statusFilter = req.nextUrl.searchParams.get('status')?.trim().toLowerCase();
  let q = db
    .from('clawd_crm_orders')
    .select('*')
    .eq('customer_id', id)
    .order('placed_at', { ascending: false })
    .limit(500);

  if (statusFilter && statusFilter !== 'all') {
    q = q.eq('status', statusFilter);
  }

  const { data, error } = await q;

  if (error) {
    if (isMissingTableError(error)) {
      return NextResponse.json({ orders: [] });
    }
    console.error('[onepeace-shop] list orders failed', { id, message: error.message });
    return NextResponse.json({ error: 'Failed to list orders' }, { status: 500 });
  }

  const orders = (data ?? []).map((o: OrderRow) => ({
    id: o.id,
    amountTotal: Number(o.amount_total),
    currency: o.currency,
    status: o.status,
    externalRef: o.external_ref,
    placedAt: o.placed_at,
    createdAt: o.created_at,
  }));

  return NextResponse.json({ orders });
}
