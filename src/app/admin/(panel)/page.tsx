'use client';

import { BanknotesIcon, ShoppingCartIcon, UsersIcon } from '@heroicons/react/24/outline';
import { useCallback, useEffect, useState } from 'react';
import { KPICard } from '@/components/admin/kpi-card';
import { shopJson } from '@/lib/shop-api';

interface OverviewResponse {
  currency: string;
  totalRevenue: number;
  orders: number;
  clients: number;
  from: string;
  to: string;
  tenantScoped: boolean;
}

function formatMoney(currency: string, value: number): string {
  try {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: currency || 'EUR' }).format(value);
  } catch {
    return `${value.toFixed(2)} ${currency}`;
  }
}

export default function AdminDashboardPage() {
  const [data, setData] = useState<OverviewResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const json = await shopJson<OverviewResponse>('analytics/overview');
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-[color:var(--dashboard-text-bright)]">Vue d’ensemble</h1>
        <p className="mt-1 text-sm text-[color:var(--dashboard-text-secondary)]">
          Indicateurs issus des factures (analytics backend). Période par défaut : 30 derniers jours.
        </p>
      </div>

      {error ? (
        <p className="rounded-[var(--dashboard-radius-input)] border border-[color:var(--dashboard-error-border)] bg-[color:var(--dashboard-error-bg)] px-3 py-2 text-sm text-[color:var(--dashboard-error)]">
          {error}
        </p>
      ) : null}

      {loading ? (
        <div className="grid gap-4 md:grid-cols-3">
          {[0, 1, 2].map(i => (
            <div
              key={i}
              className="h-28 animate-pulse rounded-[var(--dashboard-radius-card)] bg-[color:var(--dashboard-card)]"
            />
          ))}
        </div>
      ) : data ? (
        <div className="grid gap-4 md:grid-cols-3">
          <KPICard
            title="Revenus (factures payées)"
            value={formatMoney(data.currency, data.totalRevenue)}
            hint={data.tenantScoped ? `${data.from} → ${data.to}` : 'Tenant non résolu — vérifiez HEARST_TENANT_ID'}
            icon={<BanknotesIcon className="h-5 w-5" />}
          />
          <KPICard
            title="Commandes (factures)"
            value={String(data.orders)}
            hint="Hors brouillon / annulées / avoirs"
            icon={<ShoppingCartIcon className="h-5 w-5" />}
          />
          <KPICard
            title="Clients (clés uniques)"
            value={String(data.clients)}
            hint="Basé sur email / nom client facture"
            icon={<UsersIcon className="h-5 w-5" />}
          />
        </div>
      ) : null}
    </div>
  );
}
