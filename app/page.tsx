'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { ArrowRight, AlertTriangle, TrendingUp, TrendingDown, Package } from 'lucide-react';
import { api } from '@/lib/api';
import { FreshnessBanner } from '@/components/freshness-banner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { formatNumber, formatDate, statusBadgeClass, statusLabel } from '@/lib/utils';

export default function DashboardPage() {
  const dash = useQuery({ queryKey: ['crm-dashboard'], queryFn: api.crmDashboard });
  const digest = useQuery({ queryKey: ['digest', 14], queryFn: () => api.listingDigest(14) });

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold">Dashboard</h1>
          <p className="text-sm text-[var(--color-muted)]">
            Real-time view of LCBO performance, OOS risk, and listing changes.
          </p>
        </div>
      </header>

      <FreshnessBanner />

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <KpiCard
          label="Latest Snapshot"
          value={dash.data?.latest_snapshot ? formatDate(dash.data.latest_snapshot) : '—'}
          tone="default"
          loading={dash.isLoading}
        />
        <KpiCard
          label="Brink-of-OOS Stores"
          value={dash.data ? formatNumber(dash.data.oos_brink_count) : '—'}
          tone={dash.data && dash.data.oos_brink_count > 0 ? 'danger' : 'default'}
          loading={dash.isLoading}
          icon={<AlertTriangle size={16} />}
          href="/oos"
        />
        <KpiCard
          label="New Listings (7d)"
          value={
            dash.data
              ? formatNumber(
                  (dash.data.digest_last_7_days?.NEW_LISTING ?? 0) +
                    (dash.data.digest_last_7_days?.RELISTED ?? 0),
                )
              : '—'
          }
          tone="success"
          loading={dash.isLoading}
          icon={<TrendingUp size={16} />}
        />
        <KpiCard
          label="Delistings (7d)"
          value={dash.data ? formatNumber(dash.data.digest_last_7_days?.DELISTED ?? 0) : '—'}
          tone={
            dash.data && (dash.data.digest_last_7_days?.DELISTED ?? 0) > 0 ? 'warn' : 'default'
          }
          loading={dash.isLoading}
          icon={<TrendingDown size={16} />}
        />
      </div>

      {/* Tracked SKU rollup */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Package size={18} className="text-[var(--color-accent)]" />
              Tracked Products
            </CardTitle>
            <Link
              href="/sod"
              className="text-xs text-[var(--color-accent)] hover:underline flex items-center gap-1"
            >
              SOD details <ArrowRight size={12} />
            </Link>
          </div>
          <CardDescription>From the latest SOD snapshot, our 8 tracked SKUs.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <table className="data-table table-to-cards min-w-[600px] sm:min-w-0">
              <thead>
                <tr>
                  <th>Brand</th>
                  <th>Product</th>
                  <th>Status</th>
                  <th className="text-right">Stores</th>
                  <th className="text-right">Total On-Hand</th>
                </tr>
              </thead>
              <tbody>
                {dash.data?.tracked_sku_rollup.map((p) => (
                  <tr key={p.sku}>
                    <td data-label="Brand">{p.brand}</td>
                    <td data-label="Product">
                      <Link
                        href={`/skus/${p.sku}`}
                        className="text-[var(--color-foreground)] hover:text-[var(--color-accent)]"
                      >
                        {p.product_name}
                      </Link>
                      <div className="text-[10px] text-[var(--color-muted)] font-mono">{p.sku}</div>
                    </td>
                    <td data-label="Status">
                      <span className={statusBadgeClass(p.current_status)}>
                        {statusLabel(p.current_status)}
                      </span>
                    </td>
                    <td data-label="Stores" className="text-right tabular-nums">
                      {p.store_count}
                    </td>
                    <td data-label="On-Hand" className="text-right tabular-nums">
                      {formatNumber(p.total_on_hand)}
                    </td>
                  </tr>
                )) ??
                  Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i}>
                      <td colSpan={5}>
                        <div className="skeleton h-5 w-full" />
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Two-col: territories + recent changes */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Territory Coverage</CardTitle>
            <CardDescription>{dash.data?.territories.length ?? 0} regions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {dash.data?.territories.map((t) => (
                <Link
                  key={t.code}
                  href={`/territories?code=${t.code}`}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors"
                >
                  <span
                    className="w-1 h-8 rounded-full flex-shrink-0"
                    style={{ background: t.color }}
                  />
                  <span className="flex-1 text-sm">{t.name}</span>
                  <span className="text-xs text-[var(--color-muted)] tabular-nums">
                    {t.store_count}
                  </span>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Recent Listing Changes</CardTitle>
            <CardDescription>
              Last 14 days · {digest.data?.changes.length ?? 0} events
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto -mx-4 sm:mx-0 max-h-96">
              <table className="data-table min-w-[500px]">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Type</th>
                    <th>Product</th>
                    <th>Old → New</th>
                  </tr>
                </thead>
                <tbody>
                  {digest.data?.changes.slice(0, 30).map((c, i) => (
                    <tr key={i} className={c.is_tracked ? 'bg-[rgba(212,165,116,0.05)]' : ''}>
                      <td className="text-xs text-[var(--color-muted)]">{formatDate(c.change_date)}</td>
                      <td>
                        <span className={changeTypeClass(c.change_type)}>{c.change_type}</span>
                      </td>
                      <td className="text-sm">
                        {c.brand} {c.product_name?.slice(0, 28)}
                      </td>
                      <td className="text-xs">
                        {c.old_status ?? '—'} → {c.new_status ?? '—'}
                      </td>
                    </tr>
                  )) ?? <SkeletonRows cols={4} />}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function KpiCard({
  label,
  value,
  tone = 'default',
  loading,
  icon,
  href,
}: {
  label: string;
  value: string;
  tone?: 'default' | 'success' | 'danger' | 'warn';
  loading?: boolean;
  icon?: React.ReactNode;
  href?: string;
}) {
  const accentColor = {
    default: 'var(--color-accent)',
    success: 'var(--color-success)',
    danger: 'var(--color-danger)',
    warn: 'var(--color-warning)',
  }[tone];

  const inner = (
    <Card className="relative overflow-hidden h-full">
      <div
        className="absolute top-0 left-0 right-0 h-0.5"
        style={{ background: accentColor }}
      />
      <CardContent className="pt-4">
        <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-[var(--color-muted)]">
          <span>{label}</span>
          {icon && <span style={{ color: accentColor }}>{icon}</span>}
        </div>
        <div className="text-2xl sm:text-3xl font-semibold mt-2">
          {loading ? <span className="skeleton inline-block h-7 w-20" /> : value}
        </div>
      </CardContent>
    </Card>
  );
  return href ? (
    <Link href={href} className="block transition-transform hover:scale-[1.01]">
      {inner}
    </Link>
  ) : (
    inner
  );
}

function changeTypeClass(t: string) {
  const base = 'badge ';
  if (t === 'NEW_LISTING' || t === 'RELISTED') return base + 'badge-listed';
  if (t === 'DELISTED') return base + 'badge-delisted';
  if (t === 'STATUS_FLIP') return base + 'badge-delisting';
  return base;
}

function SkeletonRows({ cols, rows = 5 }: { cols: number; rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <tr key={i}>
          <td colSpan={cols}>
            <div className="skeleton h-5" />
          </td>
        </tr>
      ))}
    </>
  );
}
