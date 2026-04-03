'use client';

import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react';
import { PencilIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import { useCallback, useEffect, useState } from 'react';
import { DataTable, type Column } from '@/components/admin/data-table';
import { shopJson } from '@/lib/shop-api';
import { resolveProductImages } from '@/lib/product-image-resolver';

interface ProductDto {
  id: string;
  name: string;
  description: string;
  priceCents: number;
  category: string;
  inStock: boolean;
  imageUrls: string[];
  createdAt: string;
  updatedAt: string;
}

interface ListResponse {
  items: ProductDto[];
  total: number;
  page: number;
  limit: number;
}

function eurosToCents(value: string): number {
  const n = Number.parseFloat(value.replace(',', '.'));
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100);
}

function centsToEuros(cents: number): string {
  return (cents / 100).toFixed(2);
}

export default function AdminProductsPage() {
  const [rows, setRows] = useState<ProductDto[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ProductDto | null>(null);
  const [formName, setFormName] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formPrice, setFormPrice] = useState('');
  const [formCategory, setFormCategory] = useState('uncategorized');
  const [formInStock, setFormInStock] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const q = new URLSearchParams({ page: String(page), limit: '20', sort: 'new' });
      const data = await shopJson<ListResponse>(`products?${q.toString()}`);
      const resolved = data.items.map((p: ProductDto) => ({
        ...p,
        imageUrls: resolveProductImages(p.imageUrls, p.name, p.category),
      }));
      setRows(resolved);
      setTotal(data.total);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    void load();
  }, [load]);

  function openCreate() {
    setEditing(null);
    setFormName('');
    setFormDesc('');
    setFormPrice('');
    setFormCategory('uncategorized');
    setFormInStock(true);
    setDialogOpen(true);
  }

  function openEdit(p: ProductDto) {
    setEditing(p);
    setFormName(p.name);
    setFormDesc(p.description);
    setFormPrice(centsToEuros(p.priceCents));
    setFormCategory(p.category);
    setFormInStock(p.inStock);
    setDialogOpen(true);
  }

  async function saveProduct() {
    setSaving(true);
    try {
      const price_cents = eurosToCents(formPrice);
      if (editing) {
        await shopJson(`products/${editing.id}`, {
          method: 'PUT',
          body: JSON.stringify({
            name: formName,
            description: formDesc,
            price_cents,
            category: formCategory,
            in_stock: formInStock,
            image_urls: editing.imageUrls,
          }),
        });
      } else {
        await shopJson('products', {
          method: 'POST',
          body: JSON.stringify({
            name: formName,
            description: formDesc,
            price_cents,
            category: formCategory,
            in_stock: formInStock,
            image_urls: [],
          }),
        });
      }
      setDialogOpen(false);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sauvegarde impossible');
    } finally {
      setSaving(false);
    }
  }

  async function removeProduct(p: ProductDto) {
    if (!globalThis.confirm(`Supprimer « ${p.name} » ?`)) return;
    try {
      await shopJson(`products/${p.id}`, { method: 'DELETE' });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Suppression impossible');
    }
  }

  async function toggleStock(p: ProductDto) {
    try {
      await shopJson(`products/${p.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          name: p.name,
          description: p.description,
          price_cents: p.priceCents,
          category: p.category,
          in_stock: !p.inStock,
          image_urls: p.imageUrls,
        }),
      });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Mise à jour stock impossible');
    }
  }

  const columns: Column<ProductDto>[] = [
    {
      id: 'image',
      header: '',
      cell: r => (
        <div className="h-10 w-10 shrink-0 overflow-hidden rounded-md bg-[color:var(--dashboard-card-2)]">
          {r.imageUrls[0] ? (
            <img src={r.imageUrls[0]} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-[8px] text-[color:var(--dashboard-text-ghost)]">—</div>
          )}
        </div>
      ),
    },
    { id: 'name', header: 'Nom', cell: r => r.name },
    {
      id: 'price',
      header: 'Prix',
      cell: r => `${centsToEuros(r.priceCents)} €`,
      className: 'font-[family-name:var(--font-mono)] tabular-nums',
    },
    { id: 'category', header: 'Catégorie', cell: r => r.category },
    {
      id: 'stock',
      header: 'Stock',
      cell: r => (
        <button
          type="button"
          onClick={() => void toggleStock(r)}
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition ${
            r.inStock
              ? 'bg-green-50 text-green-700 hover:bg-green-100'
              : 'bg-red-50 text-red-700 hover:bg-red-100'
          }`}
        >
          <span className={`inline-block h-1.5 w-1.5 rounded-full ${r.inStock ? 'bg-green-500' : 'bg-red-500'}`} />
          {r.inStock ? 'En stock' : 'Rupture'}
        </button>
      ),
    },
    {
      id: 'actions',
      header: '',
      cell: r => (
        <div className="flex justify-end gap-2">
          <button
            type="button"
            className="rounded-md p-1.5 text-[color:var(--dashboard-text-muted)] hover:bg-[color:var(--dashboard-overlay-05)] hover:text-[color:var(--dashboard-accent)]"
            onClick={() => openEdit(r)}
            aria-label="Modifier"
          >
            <PencilIcon className="h-4 w-4" />
          </button>
          <button
            type="button"
            className="rounded-md p-1.5 text-[color:var(--dashboard-text-muted)] hover:bg-[color:var(--dashboard-error-bg)] hover:text-[color:var(--dashboard-error)]"
            onClick={() => void removeProduct(r)}
            aria-label="Supprimer"
          >
            <TrashIcon className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  const pages = Math.max(1, Math.ceil(total / 20));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-lg font-semibold text-[color:var(--dashboard-text-bright)]">Produits</h1>
          <p className="mt-1 text-sm text-[color:var(--dashboard-text-secondary)]">
            Catalogue (`hearst_products`). Création / édition / suppression réservées aux admins.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center justify-center gap-2 rounded-[var(--dashboard-radius-button)] bg-[color:var(--dashboard-accent)] px-4 py-2 text-sm font-medium text-[color:var(--dashboard-page)]"
        >
          <PlusIcon className="h-4 w-4" />
          Nouveau produit
        </button>
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
          <DataTable columns={columns} rows={rows} getRowKey={r => r.id} emptyLabel="Aucun produit" />
          <div className="flex items-center justify-between text-sm text-[color:var(--dashboard-text-muted)]">
            <span>
              {total} produit{total === 1 ? '' : 's'}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={page <= 1}
                className="rounded-md border border-[color:var(--dashboard-border-mid)] px-3 py-1 disabled:opacity-40"
                onClick={() => setPage(p => Math.max(1, p - 1))}
              >
                Précédent
              </button>
              <span className="px-2 py-1">
                {page} / {pages}
              </span>
              <button
                type="button"
                disabled={page >= pages}
                className="rounded-md border border-[color:var(--dashboard-border-mid)] px-3 py-1 disabled:opacity-40"
                onClick={() => setPage(p => Math.min(pages, p + 1))}
              >
                Suivant
              </button>
            </div>
          </div>
        </>
      )}

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} className="relative z-50">
        <div className="fixed inset-0 bg-[color:var(--dashboard-overlay-dark-30)]" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <DialogPanel className="w-full max-w-md rounded-[var(--dashboard-radius-card)] border border-[color:var(--dashboard-border-mid)] bg-[color:var(--dashboard-card)] p-6 shadow-[var(--dashboard-shadow-lg)]">
            <DialogTitle className="text-base font-semibold text-[color:var(--dashboard-text-bright)]">
              {editing ? 'Modifier le produit' : 'Nouveau produit'}
            </DialogTitle>
            <div className="mt-4 flex flex-col gap-3">
              <label className="text-sm">
                <span className="text-[color:var(--dashboard-text-secondary)]">Nom</span>
                <input
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  className="mt-1 w-full rounded-[var(--dashboard-radius-input)] border border-[color:var(--dashboard-border-mid)] bg-[color:var(--dashboard-surface)] px-3 py-2 text-[color:var(--dashboard-text-primary)]"
                />
              </label>
              <label className="text-sm">
                <span className="text-[color:var(--dashboard-text-secondary)]">Description</span>
                <textarea
                  value={formDesc}
                  onChange={e => setFormDesc(e.target.value)}
                  rows={3}
                  className="mt-1 w-full rounded-[var(--dashboard-radius-input)] border border-[color:var(--dashboard-border-mid)] bg-[color:var(--dashboard-surface)] px-3 py-2 text-[color:var(--dashboard-text-primary)]"
                />
              </label>
              <label className="text-sm">
                <span className="text-[color:var(--dashboard-text-secondary)]">Prix (EUR)</span>
                <input
                  value={formPrice}
                  onChange={e => setFormPrice(e.target.value)}
                  inputMode="decimal"
                  className="mt-1 w-full rounded-[var(--dashboard-radius-input)] border border-[color:var(--dashboard-border-mid)] bg-[color:var(--dashboard-surface)] px-3 py-2 font-[family-name:var(--font-mono)] text-[color:var(--dashboard-text-primary)]"
                />
              </label>
              <label className="text-sm">
                <span className="text-[color:var(--dashboard-text-secondary)]">Catégorie</span>
                <input
                  value={formCategory}
                  onChange={e => setFormCategory(e.target.value)}
                  className="mt-1 w-full rounded-[var(--dashboard-radius-input)] border border-[color:var(--dashboard-border-mid)] bg-[color:var(--dashboard-surface)] px-3 py-2 text-[color:var(--dashboard-text-primary)]"
                />
              </label>
              <label className="flex items-center gap-2 text-sm text-[color:var(--dashboard-text-secondary)]">
                <input
                  type="checkbox"
                  checked={formInStock}
                  onChange={e => setFormInStock(e.target.checked)}
                  className="rounded border-[color:var(--dashboard-border-mid)]"
                />
                En stock
              </label>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDialogOpen(false)}
                className="rounded-[var(--dashboard-radius-button)] border border-[color:var(--dashboard-border-mid)] px-4 py-2 text-sm text-[color:var(--dashboard-text-primary)]"
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={saving || !formName.trim()}
                onClick={() => void saveProduct()}
                className="rounded-[var(--dashboard-radius-button)] bg-[color:var(--dashboard-accent)] px-4 py-2 text-sm font-medium text-[color:var(--dashboard-page)] disabled:opacity-50"
              >
                {saving ? 'Enregistrement…' : 'Enregistrer'}
              </button>
            </div>
          </DialogPanel>
        </div>
      </Dialog>
    </div>
  );
}
