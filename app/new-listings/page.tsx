'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { TrendingUp, Calendar, RefreshCw, Eye, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatNumber } from '@/lib/utils';

/**
 * New Listings by Date Range — per-SKU snapshot-diff view.
 *
 * For each tracked SKU: compare two SOD snapshots (start vs end) and find
 * stores that became Listed in the window. Cross-check each one against
 * lcbo.com inventory_history (qty>0 in window) and rep_listing_observations
 * to catch listings SOD might have hidden.
 *
 * Three discovery sources per row:
 *   - SOD: caught by SOD's listing-status diff
 *   - lcbo_only: SOD missed it but lcbo.com saw stock (commission claim)
 *   - rep_only: rep flagged it on shelf, no SOD or lcbo confirmation
 */
export default function NewListingsPage() {
  const today = new Date();
  const fmt = (d: Date) => d.toISOString().slice(0, 10);

  // Default to 30-day window
  const [start, setStart] = useState(fmt(new Date(today.getTime() - 30 * 86400 * 1000)));
  const [end, setEnd] = useState(fmt(today));
  const [skuFilter, setSkuFilter] = useState<string>('');
  const [expandedSku, setExpandedSku] = useState<string | null>(null);

  const audit = useQuery({
    queryKey: ['new-listings-by-range', start, end, skuFilter],
    queryFn: () =>
      api.newListingsByRange({
        start,
        end,
        sku: skuFilter || undefined,
        include_lcbo: true,
      }),
    refetchInterval: 5 * 60_000, // every 5 min
  });

  const tracked = useQuery({
    queryKey: ['sod-products', true],
    queryFn: () => api.sodProducts(true),
  });
  const trackedList = tracked.data?.products ?? tracked.data?.rows ?? [];

  // Quick-window presets
  const presets = useMemo(
    () => [
      { label: '10d', days: 10 },
      { label: '20d', days: 20 },
      { label: '30d', days: 30 },
      { label: '60d', days: 60 },
      { label: '90d', days: 90 },
      { label: 'YTD', days: Math.ceil((today.getTime() - new Date(today.getFullYear(), 0, 1).getTime()) / 86400000) },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  function applyPreset(days: number) {
    setStart(fmt(new Date(today.getTime() - days * 86400 * 1000)));
    setEnd(fmt(today));
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl sm:text-3xl font-semibold flex items-center gap-2">
          <TrendingUp size={24} className="text-[var(--color-accent)]" />
          New Listings by Date Range
        </h1>
        <p className="text-sm text-[var(--color-muted)]">
          Per-SKU snapshot diff between any two dates. Cross-checks SOD + lcbo.com
          + rep observations so listings hidden from SOD still get caught.
        </p>
      </header>

      {/* Window controls */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Window</CardTitle>
          <CardDescription>
            Compares the SOD snapshot at-or-before each date. Window:{' '}
            {audit.data?.window.days} days.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {presets.map((p) => (
              <button
                key={p.label}
                onClick={() => applyPreset(p.days)}
                className="px-3 py-1.5 rounded text-xs border border-[var(--color-card-border)] hover:bg-[var(--color-accent)] hover:text-[#2a1f0f] transition-colors"
              >
                Last {p.label}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Field label="Start date">
              <input
                type="date"
                value={start}
                onChange={(e) => setStart(e.target.value)}
                className="select"
                max={end}
              />
            </Field>
            <Field label="End date">
              <input
                type="date"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
                className="select"
                min={start}
                max={fmt(today)}
              />
            </Field>
            <Field label="SKU filter">
              <select
                value={skuFilter}
                onChange={(e) => setSkuFilter(e.target.value)}
                className="select"
              >
                <option value="">All tracked SKUs</option>
                {trackedList.map((p) => (
                  <option key={p.sku} value={p.sku}>
                    {p.brand} — {p.product_name}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => audit.refetch()}
            disabled={audit.isFetching}
          >
            <RefreshCw size={14} className={audit.isFetching ? 'animate-spin' : ''} />
            {audit.isFetching ? 'Computing…' : 'Re-run'}
          </Button>
        </CardContent>
      </Card>

      {/* Headline */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          label="New listings (union)"
          value={formatNumber(audit.data?.summary.total_new_listings ?? 0)}
          highlight="success"
          help="Total stores added across all SKUs. Counts every source."
        />
        <StatCard
          label="lcbo.com confirmed"
          value={formatNumber(audit.data?.summary.lcbo_confirmed_new ?? 0)}
          help="New listings where lcbo.com saw qty>0 in window — triple-verified"
        />
        <StatCard
          label="Listings lost"
          value={formatNumber(audit.data?.summary.total_lost_listings ?? 0)}
          highlight={audit.data?.summary.total_lost_listings ? 'warning' : undefined}
        />
        <StatCard
          label="Net change"
          value={formatNumber(audit.data?.summary.net_change ?? 0)}
          highlight={(audit.data?.summary.net_change ?? 0) >= 0 ? 'success' : 'danger'}
        />
      </div>

      {/* Per-SKU table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Per-SKU breakdown</CardTitle>
          <CardDescription>
            Click a row to see the actual stores added.
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="data-table min-w-full text-xs">
            <thead>
              <tr>
                <th></th>
                <th>SKU</th>
                <th>Product</th>
                <th>Listed @ start</th>
                <th>Listed @ end</th>
                <th>SOD new</th>
                <th>lcbo-only new</th>
                <th>Rep-only new</th>
                <th>Total new</th>
                <th>Lost</th>
                <th>Net</th>
              </tr>
            </thead>
            <tbody>
              {audit.data?.per_sku.map((r) => {
                const isOpen = expandedSku === r.sku;
                return (
                  <>
                    <tr
                      key={r.sku}
                      onClick={() => setExpandedSku(isOpen ? null : r.sku)}
                      className="cursor-pointer hover:bg-[rgba(255,255,255,0.03)]"
                    >
                      <td className="w-6">
                        {isOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                      </td>
                      <td className="font-mono">{r.sku}</td>
                      <td>
                        <span className="text-muted">{r.brand}</span> {r.product_name}
                      </td>
                      <td className="tabular-nums">{r.start_listed_count}</td>
                      <td className="tabular-nums">{r.end_listed_count}</td>
                      <td className="tabular-nums">{r.sod_new_count}</td>
                      <td
                        className="tabular-nums font-semibold"
                        style={{ color: r.lcbo_only_new_count > 0 ? 'var(--color-danger)' : undefined }}
                      >
                        {r.lcbo_only_new_count}
                      </td>
                      <td className="tabular-nums">{r.rep_only_new_count}</td>
                      <td
                        className="tabular-nums font-semibold"
                        style={{ color: r.union_new_count > 0 ? 'var(--color-success)' : undefined }}
                      >
                        {r.union_new_count}
                      </td>
                      <td
                        className="tabular-nums"
                        style={{ color: r.sod_lost_count > 0 ? 'var(--color-warning)' : undefined }}
                      >
                        {r.sod_lost_count}
                      </td>
                      <td
                        className="tabular-nums font-bold"
                        style={{
                          color:
                            r.net_change > 0
                              ? 'var(--color-success)'
                              : r.net_change < 0
                                ? 'var(--color-danger)'
                                : undefined,
                        }}
                      >
                        {r.net_change > 0 ? `+${r.net_change}` : r.net_change}
                      </td>
                    </tr>
                    {isOpen && (
                      <tr key={`${r.sku}-detail`} className="bg-[rgba(0,0,0,0.15)]">
                        <td colSpan={11} className="p-3">
                          <div className="text-[10px] text-muted mb-2">
                            Snapshots compared: {r.start_snapshot_date ?? '—'} →{' '}
                            {r.end_snapshot_date ?? '—'}
                          </div>
                          {r.new_stores.length === 0 ? (
                            <div className="text-xs text-muted py-2">
                              No new stores in this window.
                            </div>
                          ) : (
                            <div className="space-y-2">
                              <div className="text-[10px] uppercase tracking-wider text-muted font-semibold">
                                New stores ({r.new_stores.length})
                              </div>
                              <div className="flex flex-wrap gap-1">
                                {r.new_stores.map((s) => (
                                  <Link
                                    key={`${s.store_number}-${s.discovered_via}`}
                                    href={`/stores/${s.store_number}`}
                                    className={`text-xs font-mono px-2 py-1 rounded inline-flex items-center gap-1 hover:bg-[var(--color-accent)] hover:text-[#2a1f0f] ${
                                      s.discovered_via === 'lcbo_only'
                                        ? 'bg-[rgba(239,75,75,0.12)] text-[var(--color-danger)]'
                                        : s.discovered_via === 'rep_only'
                                          ? 'bg-[rgba(120,200,140,0.12)] text-[var(--color-success)]'
                                          : 'bg-[rgba(255,255,255,0.05)]'
                                    }`}
                                    title={`Discovered via: ${s.discovered_via}${s.lcbo_confirmed ? ' · lcbo confirmed' : ''}${s.rep_confirmed ? ' · rep confirmed' : ''}`}
                                  >
                                    #{s.store_number}
                                    {s.lcbo_confirmed && <span title="lcbo.com confirmed">✓</span>}
                                    {s.rep_confirmed && <Eye size={10} />}
                                  </Link>
                                ))}
                              </div>
                              {r.lost_stores.length > 0 && (
                                <>
                                  <div className="text-[10px] uppercase tracking-wider text-muted font-semibold mt-3">
                                    Lost stores ({r.lost_stores.length})
                                  </div>
                                  <div className="flex flex-wrap gap-1">
                                    {r.lost_stores.map((sn) => (
                                      <Link
                                        key={sn}
                                        href={`/stores/${sn}`}
                                        className="text-xs font-mono px-2 py-1 rounded bg-[rgba(253,203,110,0.12)] text-[var(--color-warning)] hover:bg-[var(--color-warning)] hover:text-[#2a1f0f]"
                                      >
                                        #{sn}
                                      </Link>
                                    ))}
                                  </div>
                                </>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
          {audit.isLoading && (
            <div className="py-8 text-center text-muted text-sm">
              Computing snapshot diff…
            </div>
          )}
        </CardContent>
      </Card>

      {/* How-to-read */}
      {audit.data?.how_to_read && (
        <div className="m-card flex items-start gap-3 border-[rgba(212,165,116,0.3)] bg-[rgba(212,165,116,0.06)]">
          <AlertTriangle size={18} className="text-[var(--color-accent)] shrink-0 mt-0.5" />
          <div className="text-xs text-muted">{audit.data.how_to_read}</div>
        </div>
      )}

      {/* Legend */}
      <div className="text-xs text-muted flex flex-wrap gap-4">
        <span>
          <span className="inline-block w-3 h-3 rounded bg-[rgba(255,255,255,0.05)] align-middle mr-1" />
          SOD-detected
        </span>
        <span>
          <span className="inline-block w-3 h-3 rounded bg-[rgba(239,75,75,0.12)] align-middle mr-1" />
          lcbo.com only (SOD missed)
        </span>
        <span>
          <span className="inline-block w-3 h-3 rounded bg-[rgba(120,200,140,0.12)] align-middle mr-1" />
          Rep observation only
        </span>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  highlight,
  help,
}: {
  label: string;
  value: string;
  highlight?: 'success' | 'danger' | 'warning';
  help?: string;
}) {
  const color =
    highlight === 'success'
      ? 'var(--color-success)'
      : highlight === 'danger'
        ? 'var(--color-danger)'
        : highlight === 'warning'
          ? 'var(--color-warning)'
          : 'var(--color-foreground)';
  return (
    <div className="rounded-lg border border-[var(--color-card-border)] p-3 bg-[rgba(255,255,255,0.02)]" title={help}>
      <div className="text-[10px] uppercase tracking-wider text-[var(--color-muted)]">
        {label}
      </div>
      <div className="text-2xl font-semibold mt-1 tabular-nums" style={{ color }}>
        {value}
      </div>
      {help && <div className="text-[10px] text-muted mt-1">{help}</div>}
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
