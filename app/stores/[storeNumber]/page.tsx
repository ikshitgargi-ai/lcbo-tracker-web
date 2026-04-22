'use client';

import { useQuery } from '@tanstack/react-query';
import { use } from 'react';
import { Store as StoreIcon, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { FreshnessBanner } from '@/components/freshness-banner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { formatNumber, formatDate, statusBadgeClass, statusLabel } from '@/lib/utils';

export default function StorePage({
  params,
}: {
  params: Promise<{ storeNumber: string }>;
}) {
  const { storeNumber } = use(params);
  const n = Number(storeNumber);

  const inventory = useQuery({
    queryKey: ['store-inventory', n],
    queryFn: () => api.storeInventory(n),
  });

  return (
    <div className="space-y-6">
      <Link
        href="/oos"
        className="inline-flex items-center gap-1 text-sm text-[var(--color-muted)] hover:text-[var(--color-accent)]"
      >
        <ArrowLeft size={14} /> Back
      </Link>

      <header>
        <h1 className="text-2xl sm:text-3xl font-semibold flex items-center gap-2">
          <StoreIcon size={24} className="text-[var(--color-accent)]" />
          Store #{storeNumber}
        </h1>
        <p className="text-sm text-[var(--color-muted)]">
          Our 8 tracked SKUs at this LCBO, from the latest SOD snapshot.
        </p>
      </header>

      <FreshnessBanner />

      <Card>
        <CardHeader>
          <CardTitle>SOD inventory</CardTitle>
          <CardDescription>
            {inventory.data?.sod.length ?? 0} tracked SKUs at this store.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <table className="data-table table-to-cards min-w-[600px] sm:min-w-0">
              <thead>
                <tr>
                  <th>Brand</th>
                  <th>Product</th>
                  <th>Status</th>
                  <th className="text-right">On-Hand</th>
                  <th>Snapshot</th>
                </tr>
              </thead>
              <tbody>
                {inventory.data?.sod.map((s) => (
                  <tr key={s.sku}>
                    <td data-label="Brand">{s.brand}</td>
                    <td data-label="Product">
                      <Link
                        href={`/skus/${s.sku}`}
                        className="hover:text-[var(--color-accent)]"
                      >
                        {s.product_name}
                      </Link>
                      <div className="text-[10px] text-[var(--color-muted)] font-mono">{s.sku}</div>
                    </td>
                    <td data-label="Status">
                      <span className={statusBadgeClass(s.status)}>{statusLabel(s.status)}</span>
                    </td>
                    <td data-label="On-Hand" className="text-right tabular-nums">
                      {formatNumber(s.on_hand)}
                    </td>
                    <td data-label="Snapshot" className="text-xs text-[var(--color-muted)]">
                      {formatDate(s.snapshot_date)}
                    </td>
                  </tr>
                ))}
                {inventory.data?.sod.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-[var(--color-muted)]">
                      No tracked SKUs at this store in latest snapshot.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
