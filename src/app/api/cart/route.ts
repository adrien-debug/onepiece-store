import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { z } from 'zod';

const CART_COOKIE = 'onepeace-cart';
const MAX_ITEMS = 50;

const cartItemSchema = z.object({
  product_id: z.string().uuid(),
  quantity: z.number().int().positive().max(999_999),
});

const cartBodySchema = z.object({
  items: z.array(cartItemSchema).max(MAX_ITEMS),
});

export type CartItem = z.infer<typeof cartItemSchema>;

function parseCart(raw: string | undefined): { items: CartItem[] } {
  if (!raw) return { items: [] };
  try {
    const parsed: unknown = JSON.parse(raw);
    const result = cartBodySchema.safeParse(parsed);
    if (!result.success) return { items: [] };
    return result.data;
  } catch {
    return { items: [] };
  }
}

export async function GET(req: NextRequest) {
  const raw = req.cookies.get(CART_COOKIE)?.value;
  const cart = parseCart(raw);
  return NextResponse.json(cart);
}

export async function POST(req: NextRequest) {
  try {
    const json: unknown = await req.json();
    const parsed = cartBodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid cart payload', details: parsed.error.flatten() },
        { status: 400 },
      );
    }
    const res = NextResponse.json({ ok: true, items: parsed.data.items });
    res.cookies.set(CART_COOKIE, JSON.stringify(parsed.data), {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 30,
    });
    return res;
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Invalid JSON';
    console.error('[onepeace-shop] cart POST failed', { message });
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true, items: [] });
  res.cookies.set(CART_COOKIE, '', { httpOnly: true, path: '/', maxAge: 0 });
  return res;
}
