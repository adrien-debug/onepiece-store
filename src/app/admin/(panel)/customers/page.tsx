'use client';

import { useCallback, useEffect, useState } from 'react';
import { DataTable, type Column } from '@/components/admin/data-table';
import { shopJson } from '@/lib/shop-api';

type Segment = 'all' | 'new' | 'vip' | 'inactive';

interface CustomerRow {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  signupAt: string;
  orderCount: number;
  lifetimeValue: number;
  currency: string;
  lastOrderAt: string | null;
  segments: string[];
}

interface ListResponse {
  stats: { total: number; newCount: number; vipCount: number; inactiveCount: number };
  customers: CustomerRow[];
}

function formatMoney(currency: string, value: number): string {
  try {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: currency || 'EUR' }).format(value);
  } catch {
    return `${value.toFixed(2)}`;
  }
}

export default function AdminCustomersPage() {
  const [data, setData] = useState<ListResponse | null>(null);
  const [segment, setSegment] = useState<Segment>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const q = new URLSearchParams({ segment });
      const json = await shopJson<ListResponse>(`customers?${q.toString()}`);
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [segment]);

  useEffect(() => {
    void load();
  }, [load]);

  const rows = data?.customers ?? [];

  const columns: Column<CustomerRow>[] = [
    { id: 'email', header: 'Email', cell: r => r.email },
    { id: 'name', header: 'Nom', cell: r => r.name ?? '—' },
    {
      id: 'segments',
      header: 'Segments',
      cell: r => (
        <span className="text-xs text-[color:var(--dashboard-text-secondary)]">
          {r.segments.length ? r.segments.join(', ') : '—'}
        </span>
      ),
    },
    {
      id: 'ltv',
      header: 'LTV',
      cell: r => formatMoney(r.currency, r.lifetimeValue),
      className: 'font-[family-name:var(--font-mono)] tabular-nums',
    },
    { id: 'orders', header: 'Cmd.', cell: r => String(r.orderCount) },
    {
      id: 'last',
      header: 'Dernière cmd.',
      cell: r => (r.lastOrderAt ? new Date(r.lastOrderAt).toLocaleDateString('fr-FR') : '—'),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-[color:var(--dashboard-text-bright)]">Clients CRM</h1>
        <p className="mt-1 text-sm text-[color:var(--dashboard-text-secondary)]">
          Données `clawd_crm_customers` — segments calculés côté backend.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm text-[color:var(--dashboard-text-secondary)]">
          Segment
          <select
            value={segment}
            onChange={e => setSegment(e.target.value as Segment)}
            className="rounded-[var(--dashboard-radius-input)] border border-[color:var(--dashboard-border-mid)] bg-[color:var(--dashboard-surface)] px-3 py-2 text-[color:var(--dashboard-text-primary)]"
          >
            <option value="all">Tous</option>
            <option value="new">Nouveaux</option>
            <option value="vip">VIP</option>
            <option value="inactive">Inactifs</option>
          </select>
        </label>
        {data ? (
          <span className="text-xs text-[color:var(--dashboard-text-muted)]">
            Stats globales : {data.stats.total} clients · {data.stats.newCount} nouveaux · {data.stats.vipCount} VIP ·{' '}
            {data.stats.inactiveCount} inactifs
          </span>
        ) : null}
      </div>

      {error ? (
        <p className="rounded-[var(--dashboard-radius-input)] border border-[color:var(--dashboard-error-border)] bg-[color:var(--dashboard-error-bg)] px-3 py-2 text-sm text-[color:var(--dashboard-error)]">
          {error}
        </p>
      ) : null}

      {loading ? (
        <div className="h-40 animate-pulse rounded-[var(--dashboard-radius-card)] bg-[color:var(--dashboard-card)]" />
      ) : (
        <DataTable columns={columns} rows={rows} getRowKey={r => r.id} emptyLabel="Aucun client" />
      )}
    </div>
  );
}
