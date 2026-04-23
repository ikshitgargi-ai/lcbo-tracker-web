'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Target,
  Navigation,
  Sparkles,
  ArrowRight,
  Package,
  Activity,
} from 'lucide-react';
import { api } from '@/lib/api';
import { FreshnessBanner } from '@/components/freshness-banner';
import { DeltaBadge } from '@/components/delta-badge';
import { formatNumber, formatDate, statusBadgeClass, statusLabel } from '@/lib/utils';

export default function DashboardPage() {
  const dash = useQuery({ queryKey: ['crm-dashboard'], queryFn: api.crmDashboard });
  const digest = useQuery({ queryKey: ['digest', 7], queryFn: () => api.listingDigest(7) });
  const wow = useQuery({ queryKey: ['wow-deltas'], queryFn: api.wowDeltas });

  const newCount =
    (digest.data?.counts.find((c) => c.change_type === 'NEW_LISTING')?.count ?? 0) +
    (digest.data?.counts.find((c) => c.change_type === 'RELISTED')?.count ?? 0);
  const delistedCount =
    digest.data?.counts.find((c) => c.change_type === 'DELISTED')?.count ?? 0;
  const recentChanges = (digest.data?.changes ?? []).slice(0, 5);

  return (
    <div className="space-y-5 pb-6">
      <header className="space-y-1">
        <div className="flex items-center gap-2">
          <span className="pulse-dot" />
          <span className="muted-small font-semibold uppercase tracking-wider">Live</span>
        </div>
        <h1>Dashboard</h1>
        <p className="text-muted text-sm">Real-time LCBO performance for Anu Spirits.</p>
      </header>

      <FreshnessBanner />

      {/* Top-priority KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
        <Link href="/listings" className="m-card block">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-wider text-muted font-semibold">
              New / Relisted (7d)
            </span>
            <TrendingUp size={18} style={{ color: 'var(--color-success)' }} />
          </div>
          <div
            className="text-3xl font-bold mt-1.5 tabular-nums"
            style={{ color: 'var(--color-success)' }}
          >
            {digest.isLoading ? <span className="skeleton inline-block h-8 w-20" /> : newCount}
          </div>
          <div className="text-xs text-muted mt-1">Tap for full feed →</div>
        </Link>
        <Link href="/listings" className="m-card block">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-wider text-muted font-semibold">
              Delisted (7d)
            </span>
            <TrendingDown size={18} style={{ color: 'var(--color-danger)' }} />
          </div>
          <div
            className="text-3xl font-bold mt-1.5 tabular-nums"
            style={{ color: 'var(--color-danger)' }}
          >
            {digest.isLoading ? <span className="skeleton inline-block h-8 w-20" /> : delistedCount}
          </div>
          <div className="text-xs text-muted mt-1">Tap for full feed →</div>
        </Link>
        <Link href="/oos" className="m-card block">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-wider text-muted font-semibold">
              OOS Risk
            </span>
            <AlertTriangle size={18} style={{ color: 'var(--color-warning)' }} />
          </div>
          <div
            className="text-3xl font-bold mt-1.5 tabular-nums"
            style={{ color: 'var(--color-warning)' }}
          >
            {dash.isLoading ? (
              <span className="skeleton inline-block h-8 w-20" />
            ) : (
              formatNumber(dash.data?.oos_brink_count ?? 0)
            )}
          </div>
          <div className="text-xs text-muted mt-1">Tracked SKUs at ≤2 units</div>
        </Link>
        <Link href="/opportunities" className="m-card block">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-wider text-muted font-semibold">
              Snapshot
            </span>
            <Package size={18} style={{ color: 'var(--color-accent)' }} />
          </div>
          <div className="text-xl font-bold mt-1.5 tabular-nums">
            {dash.data?.latest_snapshot ? formatDate(dash.data.latest_snapshot) : '—'}
          </div>
          <div className="text-xs text-muted mt-1">Latest SOD pull</div>
        </Link>
      </div>

      {/* Quick actions — one-tap destinations for mobile */}
      <div>
        <h2 className="mb-2">Quick Actions</h2>
        <div className="grid grid-cols-2 gap-2.5">
          <QuickAction
            href="/listings"
            icon={<Activity size={22} />}
            label="Listings Feed"
            desc="New & delisted, all LCBO"
            color="var(--color-success)"
          />
          <QuickAction
            href="/nearby"
            icon={<Navigation size={22} />}
            label="Stores Near Me"
            desc="GPS + directions"
            color="var(--color-accent)"
          />
          <QuickAction
            href="/ask"
            icon={<Sparkles size={22} />}
            label="Ask AI"
            desc="Natural language questions"
            color="#a78bfa"
          />
          <QuickAction
            href="/opportunities"
            icon={<Target size={22} />}
            label="Opportunities"
            desc="Slow-mover replacement"
            color="var(--color-warning)"
          />
        </div>
      </div>

      {/* Tracked SKUs — mobile card list, not table */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h2>Our Products</h2>
          <Link href="/sod" className="text-sm text-[var(--color-accent)] flex items-center gap-1">
            Details <ArrowRight size={14} />
          </Link>
        </div>
        <div className="space-y-2">
          {dash.isLoading &&
            Array.from({ length: 6 }).map((_, i) => <div key={i} className="skeleton h-20" />)}
          {dash.data?.tracked_sku_rollup.map((p) => {
            const wowRow = wow.data?.tracked.find((t) => t.sku === p.sku);
            return (
              <Link key={p.sku} href={`/skus/${p.sku}`} className="m-card block">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="m-card-title truncate">{p.product_name}</div>
                    <div className="m-card-meta">
                      {p.brand} · <span className="font-mono">{p.sku}</span>
                    </div>
                  </div>
                  <span className={statusBadgeClass(p.current_status)}>
                    {statusLabel(p.current_status)}
                  </span>
                </div>
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-[var(--color-card-border)]">
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-muted font-semibold">
                      Stores
                    </div>
                    <div className="font-semibold mt-0.5 tabular-nums">{p.store_count}</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-muted font-semibold">
                      On-Hand
                    </div>
                    <div className="font-semibold mt-0.5 tabular-nums">
                      {formatNumber(p.total_on_hand)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-muted font-semibold">
                      WoW
                    </div>
                    <div className="mt-0.5">
                      <DeltaBadge delta={wowRow?.wow.listed_delta} />
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-muted font-semibold">
                      MoM
                    </div>
                    <div className="mt-0.5">
                      <DeltaBadge delta={wowRow?.mom.listed_delta} />
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Recent listing changes — last 5 */}
      {recentChanges.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <h2>Recent Changes</h2>
            <Link
              href="/listings"
              className="text-sm text-[var(--color-accent)] flex items-center gap-1"
            >
              All changes <ArrowRight size={14} />
            </Link>
          </div>
          <div className="space-y-2">
            {recentChanges.map((c, i) => (
              <div key={i} className={`m-card ${c.is_tracked ? 'border-[var(--color-accent)]/40' : ''}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={`change-chip change-${c.change_type}`}>
                        {c.change_type.replace('_', ' ')}
                      </span>
                      {c.is_tracked && (
                        <span className="change-chip change-BASELINE">OURS</span>
                      )}
                    </div>
                    <div className="mt-1.5 font-medium text-sm">
                      {c.product_name || <span className="text-muted">Unknown</span>}
                    </div>
                    <div className="text-xs text-muted mt-0.5 font-mono">SKU {c.sku}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-xs text-muted">{formatDate(c.change_date)}</div>
                    <div className="text-xs mt-1 tabular-nums font-semibold">
                      {c.old_status || '—'} → {c.new_status || '—'}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Territories */}
      {dash.data?.territories && dash.data.territories.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <h2>Territories</h2>
            <Link
              href="/territories"
              className="text-sm text-[var(--color-accent)] flex items-center gap-1"
            >
              All <ArrowRight size={14} />
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {dash.data.territories.slice(0, 6).map((t) => (
              <Link
                key={t.code}
                href={`/territories?code=${t.code}`}
                className="m-card flex items-center gap-3"
              >
                <span
                  className="w-1 self-stretch rounded-full shrink-0"
                  style={{ background: t.color }}
                />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">{t.name}</div>
                  <div className="text-xs text-muted">{t.store_count} stores</div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function QuickAction({
  href,
  icon,
  label,
  desc,
  color,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  desc: string;
  color: string;
}) {
  return (
    <Link href={href} className="m-card">
      <div className="flex items-center gap-3">
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: color + '22', color }}
        >
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold truncate">{label}</div>
          <div className="text-xs text-muted truncate">{desc}</div>
        </div>
      </div>
    </Link>
  );
}
