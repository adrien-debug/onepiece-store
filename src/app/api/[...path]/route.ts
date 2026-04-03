import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { isAdmin } from '@/lib/admin-check';
import { createAdminClient } from '@/utils/supabase/admin';

export const dynamic = 'force-dynamic';

async function resolveAdminEmail(req: NextRequest): Promise<string | null> {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) return null;

  const token = await getToken({ req, secret, secureCookie: false });
  if (token?.email && typeof token.email === 'string') return token.email;

  const sessionCookie = req.cookies.get('next-auth.session-token')?.value;
  if (!sessionCookie) return null;

  try {
    const { jwtDecrypt } = await import('jose');
    const enc = new TextEncoder();
    const key = enc.encode(secret).slice(0, 32);
    const { payload } = await jwtDecrypt(sessionCookie, key);
    if (payload.email && typeof payload.email === 'string') return payload.email;
  } catch {
    /* fallback failed */
  }
  return null;
}

async function handleAnalyticsOverview(): Promise<NextResponse> {
  const supabase = createAdminClient();
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86_400_000).toISOString();

  const [ordersRes, customersRes] = await Promise.all([
    supabase
      .from('orders')
      .select('total_cents', { count: 'exact' })
      .gte('created_at', thirtyDaysAgo),
    supabase.from('customers').select('id', { count: 'exact' }),
  ]);

  const orders = ordersRes.data ?? [];
  const totalRevenue = orders.reduce(
    (sum, o) => sum + Number((o as Record<string, unknown>).total_cents ?? 0),
    0,
  ) / 100;

  return NextResponse.json({
    currency: 'EUR',
    totalRevenue,
    orders: ordersRes.count ?? 0,
    clients: customersRes.count ?? 0,
    from: thirtyDaysAgo,
    to: new Date().toISOString(),
    tenantScoped: false,
  });
}

async function handleRevenueChart(): Promise<NextResponse> {
  const supabase = createAdminClient();
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86_400_000).toISOString();

  const { data } = await supabase
    .from('orders')
    .select('created_at, total_cents')
    .gte('created_at', thirtyDaysAgo)
    .order('created_at', { ascending: true });

  const dayMap = new Map<string, number>();
  for (const row of data ?? []) {
    const r = row as Record<string, unknown>;
    const day = String(r.created_at).slice(0, 10);
    dayMap.set(day, (dayMap.get(day) ?? 0) + Number(r.total_cents ?? 0) / 100);
  }

  const points = Array.from(dayMap.entries()).map(([date, revenue]) => ({ date, revenue }));

  return NextResponse.json({
    currency: 'EUR',
    points,
    from: thirtyDaysAgo,
    to: new Date().toISOString(),
    tenantScoped: false,
  });
}

async function handleSales(period: string): Promise<NextResponse> {
  const supabase = createAdminClient();
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86_400_000).toISOString();

  const { data } = await supabase
    .from('orders')
    .select('created_at, total_cents')
    .gte('created_at', thirtyDaysAgo)
    .order('created_at', { ascending: true });

  const bucketMap = new Map<string, { revenue: number; orders: number }>();
  for (const row of data ?? []) {
    const r = row as Record<string, unknown>;
    const d = new Date(String(r.created_at));
    let key: string;
    if (period === 'month') key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    else if (period === 'week') {
      const weekStart = new Date(d);
      weekStart.setDate(d.getDate() - d.getDay());
      key = weekStart.toISOString().slice(0, 10);
    } else key = String(r.created_at).slice(0, 10);

    const existing = bucketMap.get(key) ?? { revenue: 0, orders: 0 };
    existing.revenue += Number(r.total_cents ?? 0) / 100;
    existing.orders += 1;
    bucketMap.set(key, existing);
  }

  const buckets = Array.from(bucketMap.entries()).map(([key, v]) => ({
    key,
    revenue: v.revenue,
    orders: v.orders,
  }));

  return NextResponse.json({
    period,
    currency: 'EUR',
    buckets,
    from: thirtyDaysAgo,
    to: new Date().toISOString(),
    tenantScoped: false,
  });
}

async function handleTopProducts(limit: number): Promise<NextResponse> {
  const supabase = createAdminClient();
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86_400_000).toISOString();

  const { data } = await supabase
    .from('order_items')
    .select('name, quantity, line_total_cents, order_id')
    .limit(1000);

  const productMap = new Map<string, { quantity: number; revenue: number }>();
  for (const row of data ?? []) {
    const r = row as Record<string, unknown>;
    const name = String(r.name);
    const existing = productMap.get(name) ?? { quantity: 0, revenue: 0 };
    existing.quantity += Number(r.quantity ?? 0);
    existing.revenue += Number(r.line_total_cents ?? 0) / 100;
    productMap.set(name, existing);
  }

  const products = Array.from(productMap.entries())
    .map(([description, v]) => ({ description, quantity: v.quantity, revenue: v.revenue }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, limit);

  return NextResponse.json({
    products,
    from: thirtyDaysAgo,
    to: new Date().toISOString(),
    tenantScoped: false,
  });
}

async function handleOrderUpdate(orderId: string, body: Record<string, unknown>): Promise<NextResponse> {
  const supabase = createAdminClient();
  const update: Record<string, unknown> = {};
  if (body.status) update.status = body.status;
  if (body.notes !== undefined) update.notes = body.notes;

  const { data, error } = await supabase
    .from('orders')
    .update(update)
    .eq('id', orderId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

async function handleRoute(
  req: NextRequest,
  pathSegments: string[],
): Promise<NextResponse> {
  const email = await resolveAdminEmail(req);
  if (!email || !isAdmin(email)) {
    console.warn('[api-catch-all] forbidden — email:', email);
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  const joined = pathSegments.join('/');
  const sp = req.nextUrl.searchParams;

  if (joined === 'analytics/overview' && req.method === 'GET') {
    return handleAnalyticsOverview();
  }
  if (joined === 'analytics/revenue-chart' && req.method === 'GET') {
    return handleRevenueChart();
  }
  if (joined.startsWith('analytics/sales') && req.method === 'GET') {
    return handleSales(sp.get('period') ?? 'day');
  }
  if (joined.startsWith('analytics/top-products') && req.method === 'GET') {
    return handleTopProducts(Number(sp.get('limit') ?? '10'));
  }

  if (
    pathSegments.length === 2 &&
    pathSegments[0] === 'orders' &&
    (req.method === 'PATCH' || req.method === 'PUT')
  ) {
    const body = (await req.json()) as Record<string, unknown>;
    return handleOrderUpdate(pathSegments[1], body);
  }

  return NextResponse.json({ error: `Route not found: ${joined}` }, { status: 404 });
}

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ path: string[] }> },
): Promise<NextResponse> {
  const { path } = await ctx.params;
  return handleRoute(req, path ?? []);
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ path: string[] }> },
): Promise<NextResponse> {
  const { path } = await ctx.params;
  return handleRoute(req, path ?? []);
}

export async function PUT(
  req: NextRequest,
  ctx: { params: Promise<{ path: string[] }> },
): Promise<NextResponse> {
  const { path } = await ctx.params;
  return handleRoute(req, path ?? []);
}

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ path: string[] }> },
): Promise<NextResponse> {
  const { path } = await ctx.params;
  return handleRoute(req, path ?? []);
}

export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ path: string[] }> },
): Promise<NextResponse> {
  const { path } = await ctx.params;
  return handleRoute(req, path ?? []);
}
