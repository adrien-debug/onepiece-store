import { NextResponse, type NextRequest } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';

function toDto(r: Record<string, unknown>) {
  return {
    id: r.id,
    userEmail: r.user_email,
    orderNumber: r.order_number,
    status: r.status,
    subtotalCents: r.subtotal_cents,
    taxCents: r.tax_cents,
    shippingCents: r.shipping_cents,
    totalCents: r.total_cents,
    currency: r.currency,
    shippingAddress: r.shipping_address,
    notes: r.notes,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const limit = Math.min(200, Math.max(1, Number(sp.get('limit') ?? '100')));
  const offset = Math.max(0, Number(sp.get('offset') ?? '0'));
  const status = sp.get('status')?.trim();

  const supabase = createAdminClient();
  let query = supabase.from('orders').select('*', { count: 'exact' });
  if (status) query = query.eq('status', status);
  query = query.order('created_at', { ascending: false }).range(offset, offset + limit - 1);

  const { data, count, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ data: (data ?? []).map(toDto), total: count ?? 0 });
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as Record<string, unknown>;
  const supabase = createAdminClient();

  const orderNumber = `OP-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

  const lines = Array.isArray(body.items) ? (body.items as Record<string, unknown>[]) : [];
  const subtotalCents = lines.reduce(
    (sum, l) => sum + Number(l.unitPriceCents ?? 0) * Number(l.quantity ?? 1),
    0,
  );
  const shippingCents = Number(body.shippingCents ?? 0);
  const taxCents = Math.round(subtotalCents * 0.2);
  const totalCents = subtotalCents + taxCents + shippingCents;

  const { data: order, error: orderErr } = await supabase
    .from('orders')
    .insert({
      user_email: String(body.email ?? 'anonymous@shop.local'),
      order_number: orderNumber,
      status: 'pending',
      subtotal_cents: subtotalCents,
      tax_cents: taxCents,
      shipping_cents: shippingCents,
      total_cents: totalCents,
      currency: 'EUR',
      shipping_address: body.shippingAddress ?? null,
      notes: typeof body.notes === 'string' ? body.notes : null,
    })
    .select()
    .single();

  if (orderErr) {
    console.error('[orders] Insert error:', orderErr.message);
    return NextResponse.json({ error: orderErr.message }, { status: 500 });
  }

  if (lines.length > 0) {
    const orderItems = lines.map(l => ({
      order_id: order.id as string,
      product_id: String(l.productId),
      name: String(l.name ?? ''),
      quantity: Number(l.quantity ?? 1),
      unit_price_cents: Number(l.unitPriceCents ?? 0),
      line_total_cents: Number(l.unitPriceCents ?? 0) * Number(l.quantity ?? 1),
    }));

    const { error: itemsErr } = await supabase.from('order_items').insert(orderItems);
    if (itemsErr) {
      console.error('[orders] Items insert error:', itemsErr.message);
    }
  }

  return NextResponse.json({ order: toDto(order), orderNumber }, { status: 201 });
}
