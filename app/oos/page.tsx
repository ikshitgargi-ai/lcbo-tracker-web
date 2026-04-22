'use client';

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { AlertTriangle, Download } from 'lucide-react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { FreshnessBanner } from '@/components/freshness-banner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatNumber, severityClass } from '@/lib/utils';
import { downloadCSV } from '@/lib/export';

export default function OosPage() {
  const [threshold, setThreshold] = useState(2);
  const [territoryId, setTerritoryId] = useState<number | undefined>();
  const [sku, setSku] = useState<string | undefined>();

  const territories = useQuery({ queryKey: ['territories'], queryFn: api.crmTerritories });
  const trackedProducts = useQuery({
    queryKey: ['sod-products', true],
    queryFn: () => api.sodProducts(true),
  });

  const oos = useQuery({
    queryKey: ['oos', threshold, territoryId, sku],
    queryFn: () => api.oosRisk({ threshold, territory_id: territoryId, sku }),
  });

  const tracked = trackedProducts.data?.products ?? trackedProducts.data?.rows ?? [];

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl sm:text-3xl font-semibold flex items-center gap-2">
          <AlertTriangle size={24} className="text-[var(--color-danger)]" />
          OOS Risk Watch
        </h1>
        <p className="text-sm text-[var(--color-muted)]">
          Stores carrying our SKU but with on-hand at or below threshold. Critical = 0 units, High =
          1, Medium = 2.
        </p>
      </header>

      <FreshnessBanner />

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Field label="SKU">
            <select
              value={sku ?? ''}
              onChange={(e) => setSku(e.target.value || undefined)}
              className="select"
            >
              <option value="">All tracked SKUs</option>
              {tracked.map((p) => (
                <option key={p.sku} value={p.sku}>
                  {p.brand} {p.product_name} ({p.sku})
                </option>
              ))}
            </select>
          </Field>
          <Field label="Territory">
            <select
              value={territoryId ?? ''}
              onChange={(e) => setTerritoryId(e.target.value ? Number(e.target.value) : undefined)}
              className="select"
            >
              <option value="">All territories</option>
              {territories.data?.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.store_count})
                </option>
              ))}
            </select>
          </Field>
          <Field label={`Threshold (≤ ${threshold})`}>
            <input
              type="number"
              min={0}
              max={20}
              value={threshold}
              onChange={(e) => setThreshold(Math.max(0, Math.min(20, Number(e.target.value) || 0)))}
              className="select"
            />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{oos.data?.length ?? 0} stores at risk</CardTitle>
              <CardDescription>Sorted by lowest on-hand first.</CardDescription>
            </div>
            {oos.data && oos.data.length > 0 && (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => downloadCSV(oos.data, 'oos-risk')}
              >
                <Download size={14} /> CSV
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <table className="data-table table-to-cards min-w-[700px] sm:min-w-0">
              <thead>
                <tr>
                  <th>Severity</th>
                  <th>Store</th>
                  <th>Product</th>
                  <th className="text-right">On-Hand</th>
                  <th>Territory</th>
                  <th>Rep</th>
                </tr>
              </thead>
              <tbody>
                {oos.data?.map((r, i) => (
                  <tr key={i}>
                    <td data-label="Severity">
                      <span className={`badge ${severityBadge(r.severity)}`}>
                        {r.severity.toUpperCase()}
                      </span>
                    </td>
                    <td data-label="Store">
                      <Link
                        href={`/stores/${r.store_number}`}
                        className="text-[var(--color-foreground)] hover:text-[var(--color-accent)]"
                      >
                        #{r.store_number}
                      </Link>
                      <div className="text-[10px] text-[var(--color-muted)]">
                        {r.account} · {r.city}
                      </div>
                    </td>
                    <td data-label="Product">
                      <div className="text-sm">{r.product_name?.slice(0, 28)}</div>
                      <div className="text-[10px] text-[var(--color-muted)] font-mono">{r.sku}</div>
                    </td>
                    <td data-label="On-Hand" className="text-right tabular-nums">
                      <span className={severityClass(r.severity) + ' text-lg font-semibold'}>
                        {formatNumber(r.on_hand)}
                      </span>
                    </td>
                    <td data-label="Territory">
                      <span
                        className="badge"
                        style={{ background: r.territory_color + '33', color: r.territory_color }}
                      >
                        {r.territory_name}
                      </span>
                    </td>
                    <td data-label="Rep">{r.rep || '—'}</td>
                  </tr>
                ))}
                {oos.isLoading &&
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      <td colSpan={6}>
                        <div className="skeleton h-6" />
                      </td>
                    </tr>
                  ))}
                {oos.data?.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-[var(--color-muted)]">
                      No stores at OOS risk. Excellent!
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

function severityBadge(s: string) {
  if (s === 'critical') return 'badge-delisted';
  if (s === 'high') return 'badge-delisting';
  return 'badge-delisting';
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[10px] uppercase tracking-wider text-[var(--color-muted)] font-medium">
        {label}
      </span>
      {children}
    </label>
  );
}
