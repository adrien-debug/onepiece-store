import { NextResponse } from 'next/server';

export async function GET() {
  const publishableKey = process.env.STRIPE_PUBLISHABLE_KEY ?? '';
  return NextResponse.json({ publishableKey });
}
