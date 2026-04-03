import { NextResponse, type NextRequest } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';

interface CustomerRow {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  created_at: string;
  order_count: number;
  lifetime_value_cents: number;
  last_order_at: string | null;
}

function toDto(r: CustomerRow) {
  const now = new Date();
  const created = new Date(r.created_at);
  const daysSinceSignup = (now.getTime() - created.getTime()) / 86_400_000;
  const isNew = daysSinceSignup < 30;
  const isVip = r.lifetime_value_cents >= 10000;
  const isInactive = r.last_order_at
    ? (now.getTime() - new Date(r.last_order_at).getTime()) / 86_400_000 > 90
    : daysSinceSignup > 30;

  const segments: string[] = [];
  if (isNew) segments.push('new');
  if (isVip) segments.push('vip');
  if (isInactive) segments.push('inactive');

  return {
    id: r.id,
    email: r.email,
    name: r.name,
    phone: r.phone,
    signupAt: r.created_at,
    orderCount: r.order_count,
    lifetimeValue: r.lifetime_value_cents / 100,
    currency: 'EUR',
    lastOrderAt: r.last_order_at,
    segments,
  };
}

export async function GET(req: NextRequest) {
  const segment = req.nextUrl.searchParams.get('segment') ?? 'all';
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(500);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const all = ((data ?? []) as CustomerRow[]).map(toDto);

  const filtered =
    segment === 'all'
      ? all
      : all.filter(c => c.segments.includes(segment));

  const stats = {
    total: all.length,
    newCount: all.filter(c => c.segments.includes('new')).length,
    vipCount: all.filter(c => c.segments.includes('vip')).length,
    inactiveCount: all.filter(c => c.segments.includes('inactive')).length,
  };

  return NextResponse.json({ customers: filtered, stats });
}
