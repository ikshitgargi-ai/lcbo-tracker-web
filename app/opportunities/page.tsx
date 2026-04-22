'use client';

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import Link from 'next/link';
import { Target, Download } from 'lucide-react';
import { api } from '@/lib/api';
import { FreshnessBanner } from '@/components/freshness-banner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatNumber, statusBadgeClass, statusLabel } from '@/lib/utils';
import { downloadCSV } from '@/lib/export';

export default function OppsPage() {
  const [sku, setSku] = useState<string | undefined>();
  const [territoryId, setTerritoryId] = useState<number | undefined>();
  const [threshold, setThreshold] = useState(3);

  const territories = useQuery({ queryKey: ['territories'], queryFn: api.crmTerritories });
  const trackedProducts = useQuery({
    queryKey: ['sod-products', true],
    queryFn: () => api.sodProducts(true),
  });
  const opps = useQuery({
    queryKey: ['opps', sku, territoryId, threshold],
    queryFn: () =>
      api.opportunities({ sku, territory_id: territoryId, slow_threshold: threshold, limit: 300 }),
  });

  const tracked = trackedProducts.data?.products ?? trackedProducts.data?.rows ?? [];

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl sm:text-3xl font-semibold flex items-center gap-2">
          <Target size={24} className="text-[var(--color-accent)]" />
          Opportunities
        </h1>
        <p className="text-sm text-[var(--color-muted)]">
          Stores where a same-category competitor is slow or delisting and we&apos;re not yet
          listed. Score-ranked: higher = easier conversion.
        </p>
      </header>

      <FreshnessBanner />

      <Card>
        <CardContent className="pt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Field label="Pitch our SKU">
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
          <Field label={`Slow if on-hand ≤ ${threshold}`}>
            <input
              type="number"
              min={0}
              max={20}
              value={threshold}
              onChange={(e) => setThreshold(Number(e.target.value) || 0)}
              className="select"
            />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{opps.data?.length ?? 0} pitch targets</CardTitle>
              <CardDescription>
                Score weights delisting + low stock + competitor status.
              </CardDescription>
            </div>
            {opps.data && opps.data.length > 0 && (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => downloadCSV(opps.data, 'opportunities')}
              >
                <Download size={14} /> CSV
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <table className="data-table table-to-cards min-w-[850px] sm:min-w-0">
              <thead>
                <tr>
                  <th className="text-right">Score</th>
                  <th>Pitch</th>
                  <th>Slow Competitor</th>
                  <th>Category</th>
                  <th>Store</th>
                  <th>Territory</th>
                  <th>Status</th>
                  <th className="text-right">On-Hand</th>
                </tr>
              </thead>
              <tbody>
                {opps.data?.map((o, i) => (
                  <tr key={i}>
                    <td data-label="Score" className="text-right">
                      <span
                        className="text-lg font-semibold"
                        style={{
                          color:
                            o.opportunity_score >= 50
                              ? 'var(--color-danger)'
                              : o.opportunity_score >= 25
                                ? 'var(--color-warning)'
                                : 'var(--color-muted)',
                        }}
                      >
                        {o.opportunity_score}
                      </span>
                    </td>
                    <td data-label="Pitch">
                      <div className="font-medium">
                        {o.our_brand} {o.our_product}
                      </div>
                      <div className="text-[10px] text-[var(--color-muted)] font-mono">
                        {o.our_sku}
                      </div>
                    </td>
                    <td data-label="Slow Competitor">
                      <div className="text-sm">{o.competitor_name?.slice(0, 32)}</div>
                      <div className="text-[10px] text-[var(--color-muted)] font-mono">
                        {o.competitor_sku}
                      </div>
                    </td>
                    <td data-label="Category" className="text-sm">
                      {o.category}
                    </td>
                    <td data-label="Store">
                      <Link
                        href={`/stores/${o.store_number}`}
                        className="hover:text-[var(--color-accent)]"
                      >
                        #{o.store_number}
                      </Link>
                      <div className="text-[10px] text-[var(--color-muted)]">{o.city}</div>
                    </td>
                    <td data-label="Territory">
                      <span
                        className="badge"
                        style={{
                          background: o.territory_color + '33',
                          color: o.territory_color,
                        }}
                      >
                        {o.territory_name}
                      </span>
                    </td>
                    <td data-label="Status">
                      <span className={statusBadgeClass(o.competitor_status)}>
                        {statusLabel(o.competitor_status)}
                      </span>
                    </td>
                    <td data-label="On-Hand" className="text-right tabular-nums">
                      {formatNumber(o.competitor_on_hand)}
                    </td>
                  </tr>
                ))}
                {opps.isLoading && (
                  <tr>
                    <td colSpan={8}>
                      <div className="skeleton h-24" />
                    </td>
                  </tr>
                )}
                {opps.data?.length === 0 && (
                  <tr>
                    <td colSpan={8} className="text-center py-8 text-[var(--color-muted)]">
                      No opportunities found. Run a SOD refresh or widen the threshold.
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
