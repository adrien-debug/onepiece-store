'use client';

import { useCart } from '@/context/cart-context';
import { formatEur } from '@/lib/money';
import type { ShippingMethod } from '@/lib/shipping';
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { loadStripe, type Stripe } from '@stripe/stripe-js';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';

const STRIPE_APPEARANCE = {
  theme: 'night' as const,
  variables: {
    colorPrimary: '#D9312B',
    colorBackground: '#ffffff',
    colorText: '#333333',
    colorDanger: '#D9312B',
    fontFamily: "'Noto Sans JP', sans-serif",
    borderRadius: '8px',
    spacingUnit: '4px',
  },
  rules: {
    '.Input': {
      border: '2px solid #eeeeee',
      backgroundColor: '#ffffff',
    },
    '.Input:focus': {
      border: '2px solid #D9312B',
      boxShadow: '0 0 0 3px rgba(217,49,43,0.2)',
    },
    '.Label': { color: '#999999' },
  },
};

function PaySection({ onPaid, onError }: { onPaid: () => void; onError: (msg: string) => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [busy, setBusy] = useState(false);

  async function handlePay(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;
    setBusy(true);
    try {
      const { error } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${typeof window !== 'undefined' ? window.location.origin : ''}/checkout?paid=1`,
        },
        redirect: 'if_required',
      });
      if (error) onError(error.message ?? 'Payment failed');
      else onPaid();
    } catch (err) {
      onError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={e => void handlePay(e)} className="space-y-4">
      <PaymentElement />
      <button
        type="submit"
        disabled={!stripe || busy}
        className="w-full rounded-full bg-[#D9312B] px-6 py-3 text-[0.9375rem] font-bold tracking-wider text-white hover:bg-[#c62828] disabled:opacity-50 transition-colors"
      >
        {busy ? 'Traitement…' : 'PAYER MAINTENANT'}
      </button>
    </form>
  );
}

export default function CheckoutPage() {
  const {
    items,
    subtotal,
    discountEur,
    shippingEurFor,
    totalFor,
    clearCart,
  } = useCart();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [postal, setPostal] = useState('');
  const [country, setCountry] = useState('FR');
  const [shippingMethod, setShippingMethod] = useState<ShippingMethod>('standard');

  const [stripePromise, setStripePromise] = useState<Promise<Stripe | null> | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch('/api/payments/config');
        const data = (await res.json()) as { publishableKey?: string | null; configured?: boolean };
        if (cancelled) return;
        if (data.publishableKey) setStripePromise(loadStripe(data.publishableKey));
      } catch {
        if (!cancelled) setError('Impossible de charger la configuration de paiement');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const total = useMemo(() => totalFor(shippingMethod), [totalFor, shippingMethod]);

  const placeOrder = useCallback(async () => {
    setError(null);
    if (items.length === 0) {
      setError('Le panier est vide');
      return;
    }
    if (!name.trim() || !email.trim() || !address.trim() || !city.trim() || !postal.trim() || !country.trim()) {
      setError('Veuillez remplir tous les champs d\'adresse');
      return;
    }

    setLoading(true);
    try {
      const notesPayload = {
        shippingMethod,
        shippingEur: shippingEurFor(shippingMethod),
        discountEur,
        payableTotalEur: total,
        source: 'onepeace-shop',
      };

      const orderRes = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: items.map(i => ({ product_id: i.productId, quantity: i.quantity })),
          tax_rate: 0,
          currency: 'EUR',
          notes: JSON.stringify(notesPayload),
          shipping_address: {
            name: name.trim(),
            email: email.trim(),
            line1: address.trim(),
            city: city.trim(),
            postal_code: postal.trim(),
            country: country.trim(),
          },
        }),
      });

      const orderJson = (await orderRes.json()) as {
        data?: { id: string; number?: string; grand_total?: number };
        error?: string;
      };

      if (!orderRes.ok || !orderJson.data?.id) {
        setError(
          typeof orderJson.error === 'string'
            ? orderJson.error
            : 'Order failed. Check backend auth (HEARST_API_KEY / HEARST_SHOP_USER_ID).',
        );
        return;
      }

      const oid = orderJson.data.id;
      setOrderId(oid);

      const amountCents = Math.max(1, Math.round(total * 100));
      const piRes = await fetch('/api/payments/create-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: amountCents,
          currency: 'eur',
          orderId: oid,
          metadata: { shop: 'onepeace', orderNumber: orderJson.data.number ?? oid },
        }),
      });

      const piJson = (await piRes.json()) as { clientSecret?: string; error?: string };
      if (!piRes.ok || !piJson.clientSecret) {
        setError(piJson.error ?? 'Impossible de démarrer le paiement');
        return;
      }

      setClientSecret(piJson.clientSecret);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [
    items,
    name,
    email,
    address,
    city,
    postal,
    country,
    shippingMethod,
    shippingEurFor,
    discountEur,
    total,
  ]);

  const onPaid = useCallback(() => {
    clearCart();
    setDone(true);
    setClientSecret(null);
  }, [clearCart]);

  if (items.length === 0 && !done) {
    return (
      <main className="mx-auto max-w-lg px-4 py-16 font-['Noto_Sans_JP',sans-serif]">
        <p className="text-[0.875rem] text-[#999999]">
          Votre panier est vide.{' '}
          <Link href="/cart" className="text-[#D9312B] hover:text-[#c62828] font-medium transition-colors">
            Retour au panier
          </Link>
        </p>
      </main>
    );
  }

  if (done) {
    return (
      <main className="mx-auto max-w-lg px-4 py-16 text-center font-['Noto_Sans_JP',sans-serif]">
        {/* Red checkmark */}
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-[#D9312B]/10">
          <svg className="h-8 w-8 text-[#D9312B]" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
        </div>
        <h1 className="mb-2 text-[1.5rem] font-bold text-[#333333]">
          Merci pour votre commande !
        </h1>
        <p className="text-[0.875rem] text-[#999999]">
          Votre paiement a été traité avec succès. Référence de commande : {orderId ?? '—'}
        </p>
        <Link
          href="/"
          className="mt-8 inline-flex items-center justify-center rounded-full bg-[#D9312B] px-8 py-3 text-[0.875rem] font-bold tracking-wider text-white hover:bg-[#c62828] transition-colors"
        >
          RETOUR À L&apos;ACCUEIL
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-10 font-['Noto_Sans_JP',sans-serif]">
      {/* Breadcrumb */}
      <nav className="mb-6 text-[0.8125rem] text-[#999999]">
        <Link href="/" className="hover:text-[#D9312B] transition-colors">Accueil</Link>
        <span className="mx-2">›</span>
        <Link href="/cart" className="hover:text-[#D9312B] transition-colors">Panier</Link>
        <span className="mx-2">›</span>
        <span className="text-[#333333]">Commande</span>
      </nav>

      {/* Title */}
      <h1 className="mb-8 inline-block pb-2 text-[1.5rem] font-bold tracking-wider text-[#333333] border-b-[3px] border-[#D9312B]">
        COMMANDE
      </h1>

      <div className="grid gap-8 lg:grid-cols-2">
        <section className="space-y-6">
          <h2 className="border-l-[3px] border-[#D9312B] pl-3 text-[0.8125rem] font-bold uppercase tracking-wider text-[#333333]">
            Adresse de livraison
          </h2>
          <div className="grid gap-3">
            <Field label="Nom complet" value={name} onChange={setName} autoComplete="name" />
            <Field label="Email" value={email} onChange={setEmail} type="email" autoComplete="email" />
            <Field label="Adresse" value={address} onChange={setAddress} autoComplete="street-address" />
            <Field label="Ville" value={city} onChange={setCity} autoComplete="address-level2" />
            <Field label="Code postal" value={postal} onChange={setPostal} autoComplete="postal-code" />
            <Field label="Pays" value={country} onChange={setCountry} autoComplete="country-name" />
          </div>

          <fieldset className="space-y-2">
            <legend className="mb-2 border-l-[3px] border-[#D9312B] pl-3 text-[0.8125rem] font-bold uppercase tracking-wider text-[#333333]">
              Mode de livraison
            </legend>
            <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-[#eeeeee] p-3 text-[0.875rem] hover:border-[#D9312B]/30 transition-colors">
              <input
                type="radio"
                name="ship"
                checked={shippingMethod === 'standard'}
                onChange={() => setShippingMethod('standard')}
                className="accent-[#D9312B]"
              />
              <span className="text-[#333333]">
                Standard — {formatEur(shippingEurFor('standard'))} (gratuit au-dessus de 50 € de sous-total après réduction)
              </span>
            </label>
            <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-[#eeeeee] p-3 text-[0.875rem] hover:border-[#D9312B]/30 transition-colors">
              <input
                type="radio"
                name="ship"
                checked={shippingMethod === 'express'}
                onChange={() => setShippingMethod('express')}
                className="accent-[#D9312B]"
              />
              <span className="text-[#333333]">
                Express — {formatEur(shippingEurFor('express'))}
              </span>
            </label>
          </fieldset>
        </section>

        <section className="space-y-4">
          <h2 className="border-l-[3px] border-[#D9312B] pl-3 text-[0.8125rem] font-bold uppercase tracking-wider text-[#333333]">
            Récapitulatif
          </h2>
          <ul className="space-y-2 border-b-2 border-[#D9312B] pb-4">
            {items.map(line => (
              <li key={line.productId} className="flex justify-between gap-2 text-[0.8125rem]">
                <span className="text-[#333333]">
                  {line.name} × {line.quantity}
                </span>
                <span className="font-medium text-[#999999]">
                  {formatEur(line.unitPrice * line.quantity)}
                </span>
              </li>
            ))}
          </ul>
          <dl className="space-y-2 text-[0.875rem]">
            <div className="flex justify-between">
              <dt className="text-[#999999]">Sous-total</dt>
              <dd className="font-medium text-[#333333]">{formatEur(subtotal)}</dd>
            </div>
            {discountEur > 0 && (
              <div className="flex justify-between">
                <dt className="text-[#999999]">Réduction</dt>
                <dd className="font-medium text-green-600">
                  −{formatEur(discountEur)}
                </dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-[#999999]">Livraison</dt>
              <dd className="font-medium text-[#333333]">
                {formatEur(shippingEurFor(shippingMethod))}
              </dd>
            </div>
            <div className="flex justify-between border-t-2 border-[#D9312B] pt-3 text-[1rem] font-bold text-[#333333]">
              <dt>Total</dt>
              <dd>{formatEur(total)}</dd>
            </div>
          </dl>

          {error && (
            <p className="rounded-lg border border-[#D9312B] bg-[#D9312B]/5 px-3 py-2 text-[0.8125rem] text-[#D9312B]">
              {error}
            </p>
          )}

          {!clientSecret && (
            <button
              type="button"
              onClick={() => void placeOrder()}
              disabled={loading}
              className="w-full rounded-full bg-[#D9312B] px-6 py-3 text-[0.9375rem] font-bold tracking-wider text-white hover:bg-[#c62828] disabled:opacity-50 transition-colors"
            >
              {loading ? 'Création de la commande…' : 'CONFIRMER LA COMMANDE'}
            </button>
          )}

          {clientSecret && stripePromise && (
            <div className="rounded-xl border border-[#eeeeee] bg-white p-4 shadow-[0_2px_8px_rgba(0,0,0,0.1)]">
              <h3 className="mb-3 border-l-[3px] border-[#D9312B] pl-3 text-[0.8125rem] font-bold uppercase tracking-wider text-[#333333]">
                Paiement
              </h3>
              <Elements
                stripe={stripePromise}
                options={{ clientSecret, appearance: STRIPE_APPEARANCE }}
              >
                <PaySection onPaid={onPaid} onError={msg => setError(msg)} />
              </Elements>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
  autoComplete,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  autoComplete?: string;
}) {
  const id = `co-${autoComplete ?? label.replace(/\s+/g, '-').toLowerCase()}`;
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-[0.75rem] font-medium text-[#999999]">
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        autoComplete={autoComplete}
        onChange={e => onChange(e.target.value)}
        className="w-full rounded-lg border border-[#eeeeee] bg-white px-3 py-2 text-[0.875rem] text-[#333333] focus:border-[#D9312B] focus:ring-2 focus:ring-[#D9312B]/20 focus:outline-none transition-colors"
      />
    </div>
  );
}
