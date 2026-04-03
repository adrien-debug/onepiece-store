'use client';

import { useCallback, useEffect, useState } from 'react';
import { RevenueLineChart } from '@/components/admin/charts/revenue-line-chart';
import { SalesBarChart } from '@/components/admin/charts/sales-bar-chart';
import { TopProductsBar } from '@/components/admin/charts/top-products-bar';
import { shopJson } from '@/lib/shop-api';

interface RevenueChartResponse {
  currency: string;
  points: { date: string; revenue: number }[];
  from: string;
  to: string;
  tenantScoped: boolean;
}

interface SalesResponse {
  period: 'day' | 'week' | 'month';
  currency: string;
  buckets: { key: string; revenue: number; orders: number }[];
  from: string;
  to: string;
  tenantScoped: boolean;
}

interface TopProductsResponse {
  products: { description: string; quantity: number; revenue: number }[];
  from: string;
  to: string;
  tenantScoped: boolean;
}

export default function AdminAnalyticsPage() {
  const [revenue, setRevenue] = useState<RevenueChartResponse | null>(null);
  const [sales, setSales] = useState<SalesResponse | null>(null);
  const [top, setTop] = useState<TopProductsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [r, s, t] = await Promise.all([
        shopJson<RevenueChartResponse>('analytics/revenue-chart'),
        shopJson<SalesResponse>('analytics/sales?period=week'),
        shopJson<TopProductsResponse>('analytics/top-products?limit=8'),
      ]);
      setRevenue(r);
      setSales(s);
      setTop(t);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur');
      setRevenue(null);
      setSales(null);
      setTop(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-lg font-semibold text-[color:var(--dashboard-text-bright)]">Analytics</h1>
        <p className="mt-1 text-sm text-[color:var(--dashboard-text-secondary)]">
          Agrégats factures / lignes facture. Période par défaut : ~30 jours. Bucket ventes : semaine.
        </p>
      </div>

      {error ? (
        <p className="rounded-[var(--dashboard-radius-input)] border border-[color:var(--dashboard-error-border)] bg-[color:var(--dashboard-error-bg)] px-3 py-2 text-sm text-[color:var(--dashboard-error)]">
          {error}
        </p>
      ) : null}

      {loading ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {[0, 1, 2].map(i => (
            <div key={i} className="h-72 animate-pulse rounded-[var(--dashboard-radius-card)] bg-[color:var(--dashboard-card)]" />
          ))}
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <section className="rounded-[var(--dashboard-radius-card)] border border-[color:var(--dashboard-border)] bg-[color:var(--dashboard-card)] p-[var(--dashboard-padding-card)]">
            <h2 className="text-sm font-medium text-[color:var(--dashboard-text-bright)]">Revenu quotidien</h2>
            <p className="mt-1 text-xs text-[color:var(--dashboard-text-muted)]">
              {revenue?.from} → {revenue?.to}{' '}
              {revenue?.tenantScoped === false ? '(tenant non résolu)' : ''}
            </p>
            <div className="mt-4">
              <RevenueLineChart points={revenue?.points ?? []} currency={revenue?.currency ?? 'EUR'} />
            </div>
          </section>

          <section className="rounded-[var(--dashboard-radius-card)] border border-[color:var(--dashboard-border)] bg-[color:var(--dashboard-card)] p-[var(--dashboard-padding-card)]">
            <h2 className="text-sm font-medium text-[color:var(--dashboard-text-bright)]">Ventes par semaine</h2>
            <p className="mt-1 text-xs text-[color:var(--dashboard-text-muted)]">
              {sales?.from} → {sales?.to} · {sales?.period}
            </p>
            <div className="mt-4">
              <SalesBarChart buckets={sales?.buckets ?? []} currency={sales?.currency ?? 'EUR'} />
            </div>
          </section>

          <section className="rounded-[var(--dashboard-radius-card)] border border-[color:var(--dashboard-border)] bg-[color:var(--dashboard-card)] p-[var(--dashboard-padding-card)] lg:col-span-2">
            <h2 className="text-sm font-medium text-[color:var(--dashboard-text-bright)]">Top produits (lignes facture)</h2>
            <p className="mt-1 text-xs text-[color:var(--dashboard-text-muted)]">
              {top?.from} → {top?.to}
            </p>
            <div className="mt-4">
              <TopProductsBar products={top?.products ?? []} currency={revenue?.currency ?? 'EUR'} />
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
