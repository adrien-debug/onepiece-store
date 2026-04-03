'use client';

import { useCallback, useEffect, useState } from 'react';
import { DataTable, type Column } from '@/components/admin/data-table';
import { shopJson } from '@/lib/shop-api';

const ORDER_STATUSES = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'] as const;

type OrderStatus = (typeof ORDER_STATUSES)[number];

interface OrderRow {
  id: string;
  status?: string;
  total?: number | string | null;
  grand_total?: number | string | null;
  created_at?: string;
  order_number?: string;
  payment_status?: string;
  customer_id?: string;
  user_id?: string;
}

interface ListResponse {
  data: OrderRow[];
  total: number;
}

function formatTotal(row: OrderRow): string {
  const v = row.grand_total ?? row.total;
  if (v === undefined || v === null) return '—';
  const n = typeof v === 'number' ? v : Number(v);
  if (!Number.isFinite(n)) return String(v);
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n);
}

export default function AdminOrdersPage() {
  const [rows, setRows] = useState<OrderRow[]>([]);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState<OrderStatus | ''>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const q = new URLSearchParams({ limit: '100', offset: '0' });
      if (status) q.set('status', status);
      const data = await shopJson<ListResponse>(`orders?${q.toString()}`);
      setRows(Array.isArray(data.data) ? data.data : []);
      setTotal(data.total ?? 0);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erreur';
      if (msg.includes('table') || msg.includes('schema')) {
        setError('La table "orders" n\'existe pas encore. Créez la migration Supabase.');
      } else {
        setError(msg);
      }
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    void load();
  }, [load]);

  async function updateStatus(orderId: string, next: OrderStatus) {
    try {
      await shopJson(`orders/${orderId}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status: next }),
      });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Mise à jour impossible');
    }
  }

  const columns: Column<OrderRow>[] = [
    {
      id: 'id',
      header: 'ID',
      cell: r => <span className="font-[family-name:var(--font-mono)] text-xs">{r.id.slice(0, 8)}…</span>,
    },
    { id: 'order_number', header: 'Réf.', cell: r => r.order_number ?? '—' },
    {
      id: 'status',
      header: 'Statut',
      cell: r => (
        <select
          className="w-full min-w-[140px] rounded-[var(--dashboard-radius-input)] border border-[color:var(--dashboard-border-mid)] bg-[color:var(--dashboard-surface)] px-2 py-1 text-sm text-[color:var(--dashboard-text-primary)]"
          value={(ORDER_STATUSES as readonly string[]).includes(r.status ?? '')
            ? (r.status as OrderStatus)
            : 'pending'}
          onChange={e => void updateStatus(r.id, e.target.value as OrderStatus)}
        >
          {ORDER_STATUSES.map(s => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      ),
    },
    { id: 'total', header: 'Total', cell: r => formatTotal(r) },
    { id: 'pay', header: 'Paiement', cell: r => r.payment_status ?? '—' },
    {
      id: 'created',
      header: 'Créé',
      cell: r => (r.created_at ? new Date(r.created_at).toLocaleString('fr-FR') : '—'),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-[color:var(--dashboard-text-bright)]">Commandes</h1>
        <p className="mt-1 text-sm text-[color:var(--dashboard-text-secondary)]">
          Liste tenant-scoped (`orders`). Filtre par statut ; mise à jour du statut (admin).
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm text-[color:var(--dashboard-text-secondary)]">
          Statut
          <select
            value={status}
            onChange={e => setStatus(e.target.value as OrderStatus | '')}
            className="rounded-[var(--dashboard-radius-input)] border border-[color:var(--dashboard-border-mid)] bg-[color:var(--dashboard-surface)] px-3 py-2 text-[color:var(--dashboard-text-primary)]"
          >
            <option value="">Tous</option>
            {ORDER_STATUSES.map(s => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
      </div>

      {error ? (
        <p className="rounded-[var(--dashboard-radius-input)] border border-[color:var(--dashboard-error-border)] bg-[color:var(--dashboard-error-bg)] px-3 py-2 text-sm text-[color:var(--dashboard-error)]">
          {error}
        </p>
      ) : null}

      {loading ? (
        <div className="h-40 animate-pulse rounded-[var(--dashboard-radius-card)] bg-[color:var(--dashboard-card)]" />
      ) : (
        <>
          <DataTable columns={columns} rows={rows} getRowKey={r => r.id} emptyLabel="Aucune commande" />
          <p className="text-sm text-[color:var(--dashboard-text-muted)]">{total} commande(s) (fenêtre listée)</p>
        </>
      )}
    </div>
  );
}
