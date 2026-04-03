import { NextResponse, type NextRequest } from 'next/server';
import { getAuthorizedCustomerId } from '@/lib/api-auth';
import { isMissingTableError } from '@/lib/customer-repository';
import { getShopSupabase } from '@/lib/supabase-server';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface OrderRow {
  id: string;
  customer_id: string;
  amount_total: string | number;
  currency: string;
  status: string;
  external_ref: string | null;
  placed_at: string;
  created_at: string;
}

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string; orderId: string }> },
): Promise<NextResponse> {
  const { id, orderId } = await ctx.params;
  if (!UUID_RE.test(id) || !UUID_RE.test(orderId)) {
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

  const { data, error } = await db
    .from('clawd_crm_orders')
    .select('*')
    .eq('id', orderId)
    .eq('customer_id', id)
    .maybeSingle();

  if (error) {
    if (isMissingTableError(error)) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }
    console.error('[onepeace-shop] get order failed', { orderId, message: error.message });
    return NextResponse.json({ error: 'Failed to load order' }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }

  const o = data as OrderRow;
  const trackingNumber = o.external_ref ?? null;

  return NextResponse.json({
    order: {
      id: o.id,
      amountTotal: Number(o.amount_total),
      currency: o.currency,
      status: o.status,
      externalRef: o.external_ref,
      placedAt: o.placed_at,
      createdAt: o.created_at,
    },
    tracking: {
      carrier: null as string | null,
      number: trackingNumber,
      url: trackingNumber
        ? `https://www.google.com/search?q=${encodeURIComponent(trackingNumber)}`
        : null,
    },
  });
}
