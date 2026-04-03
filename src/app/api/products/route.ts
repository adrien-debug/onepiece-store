import { NextResponse, type NextRequest } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const page = Math.max(1, Number(sp.get('page') ?? '1'));
  const limit = Math.min(500, Math.max(1, Number(sp.get('limit') ?? '20')));
  const sort = sp.get('sort') ?? 'new';
  const category = sp.get('category')?.trim() ?? '';
  const inStock = sp.get('in_stock');
  const priceMin = sp.get('price_min');
  const priceMax = sp.get('price_max');
  const q = sp.get('q')?.trim() ?? '';

  const supabase = createAdminClient();
  const offset = (page - 1) * limit;

  let query = supabase.from('products').select('*', { count: 'exact' });

  if (category) query = query.eq('category', category);
  if (inStock === 'true') query = query.eq('in_stock', true);
  else if (inStock === 'false') query = query.eq('in_stock', false);
  if (priceMin) query = query.gte('price_cents', Number(priceMin));
  if (priceMax) query = query.lte('price_cents', Number(priceMax));
  if (q) query = query.ilike('name', `%${q}%`);

  const sortMap: Record<string, { column: string; ascending: boolean }> = {
    price_asc: { column: 'price_cents', ascending: true },
    price_desc: { column: 'price_cents', ascending: false },
    new: { column: 'created_at', ascending: false },
    popular: { column: 'created_at', ascending: false },
    random: { column: 'name', ascending: true }, // Placeholder
  };
  const s = sortMap[sort] ?? sortMap.new;
  
  if (sort === 'random') {
    // Note: To get true random in Supabase via REST, you'd need a custom RPC.
    // Here we use a trick: order by a column that is somewhat distributed.
    query = query.order('id', { ascending: Math.random() > 0.5 });
  } else {
    query = query.order(s.column, { ascending: s.ascending });
  }
  
  query = query.range(offset, offset + limit - 1);

  const { data, count, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const items = (data ?? []).map((r: Record<string, unknown>) => ({
    id: r.id,
    name: r.name,
    description: r.description,
    priceCents: r.price_cents,
    category: r.category,
    inStock: r.in_stock,
    imageUrls: r.image_urls,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }));

  return NextResponse.json({ items, total: count ?? 0, page, limit });
}
