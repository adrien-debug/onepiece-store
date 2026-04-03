import { NextResponse, type NextRequest } from 'next/server';

export async function POST(req: NextRequest) {
  const body = (await req.json()) as { totalCents?: number; currency?: string };
  const totalCents = Number(body.totalCents ?? 0);
  const currency = String(body.currency ?? 'eur');

  if (totalCents <= 0) {
    return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
  }

  const stripeSecret = process.env.STRIPE_SECRET_KEY;
  if (!stripeSecret) {
    return NextResponse.json(
      { error: 'Stripe not configured', clientSecret: null },
      { status: 200 },
    );
  }

  try {
    const stripe = (await import('stripe')).default;
    const client = new stripe(stripeSecret);
    const intent = await client.paymentIntents.create({
      amount: totalCents,
      currency,
    });
    return NextResponse.json({ clientSecret: intent.client_secret });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Stripe error';
    console.error('[payments] create-intent error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
