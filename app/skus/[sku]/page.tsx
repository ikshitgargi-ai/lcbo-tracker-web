'use client';

import { useQuery } from '@tanstack/react-query';
import { use } from 'react';
import Link from 'next/link';
import { ArrowLeft, Package } from 'lucide-react';
import { api } from '@/lib/api';
import { FreshnessBanner } from '@/components/freshness-banner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { formatNumber, formatDate, statusBadgeClass, statusLabel } from '@/lib/utils';

export default function SkuPage({
  params,
}: {
  params: Promise<{ sku: string }>;
}) {
  const { sku } = use(params);
  const oos = useQuery({
    queryKey: ['oos-for-sku', sku],
    queryFn: () => api.oosRisk({ sku, threshold: 20 }),
  });

  return (
    <div className="space-y-6">
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-sm text-[var(--color-muted)] hover:text-[var(--color-accent)]"
      >
        <ArrowLeft size={14} /> Back
      </Link>

      <header>
        <h1 className="text-2xl sm:text-3xl font-semibold flex items-center gap-2">
          <Package size={24} className="text-[var(--color-accent)]" />
          SKU {sku}
        </h1>
        <p className="text-sm text-[var(--color-muted)]">
          Store-level listing status for this SKU in the latest SOD snapshot.
        </p>
      </header>

      <FreshnessBanner />

      <Card>
        <CardHeader>
          <CardTitle>Listed stores</CardTitle>
          <CardDescription>
            Only stores showing this SKU — sorted by on-hand ascending (lowest stock first).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <table className="data-table table-to-cards min-w-[700px] sm:min-w-0">
              <thead>
                <tr>
                  <th>Store</th>
                  <th>City</th>
                  <th>Territory</th>
                  <th>Status</th>
                  <th className="text-right">On-Hand</th>
                  <th>Rep</th>
                </tr>
              </thead>
              <tbody>
                {oos.data?.map((r, i) => (
                  <tr key={i}>
                    <td data-label="Store">
                      <Link
                        href={`/stores/${r.store_number}`}
                        className="hover:text-[var(--color-accent)]"
                      >
                        #{r.store_number}
                      </Link>
                      <div className="text-[10px] text-[var(--color-muted)]">{r.account}</div>
                    </td>
                    <td data-label="City">{r.city}</td>
                    <td data-label="Territory">
                      <span
                        className="badge"
                        style={{ background: r.territory_color + '33', color: r.territory_color }}
                      >
                        {r.territory_name}
                      </span>
                    </td>
                    <td data-label="Status">
                      <span className={statusBadgeClass(r.status)}>{statusLabel(r.status)}</span>
                    </td>
                    <td data-label="On-Hand" className="text-right tabular-nums">
                      {formatNumber(r.on_hand)}
                    </td>
                    <td data-label="Rep">{r.rep || '—'}</td>
                  </tr>
                ))}
                {oos.data?.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-[var(--color-muted)]">
                      No stores carrying this SKU at/below threshold. (Try the dashboard for full
                      coverage.)
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
