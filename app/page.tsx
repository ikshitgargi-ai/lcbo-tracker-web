'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  ChevronRight,
  Tag,
  Calendar,
  Plus,
  Sparkles,
  Navigation,
  Target,
  Activity as ActivityIcon,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useActiveRep } from '@/lib/active-rep';
import { FreshnessBanner } from '@/components/freshness-banner';
import { formatNumber, formatDate, statusBadgeClass, statusLabel, relativeTime } from '@/lib/utils';

/**
 * Unified homepage — the ONE page for the rep on a phone.
 *
 * Sections (vertical scroll, mobile-first):
 *   1. Status banner (snapshot freshness)
 *   2. Brands cards (NB Distillers, Goenchi, Fratelli) — tap to drill
 *   3. Today's plan summary (if rep selected)
 *   4. New distribution wins (last 60 days, top 5)
 *   5. Critical alerts (OOS risk count + overdue deal actions)
 *   6. Recent listing changes (last 5)
 *   7. Quick actions
 */
export default function HomePage() {
  const [activeRep] = useActiveRep();
  const brands = useQuery({ queryKey: ['brands'], queryFn: api.brands });
  const additions = useQuery({
    queryKey: ['additions', { days: 60 }],
    queryFn: () => api.distributionAdditions({ days: 60 }),
  });
  const today = useQuery({
    queryKey: ['today', activeRep],
    queryFn: () => api.today(activeRep!, 5),
    enabled: !!activeRep,
  });
  const dash = useQuery({ queryKey: ['crm-dashboard'], queryFn: api.crmDashboard });
  const digest = useQuery({ queryKey: ['digest', 7], queryFn: () => api.listingDigest(7) });

  const recentChanges = (digest.data?.changes ?? []).slice(0, 5);

  return (
    <div className="space-y-5 pb-6">
      <header className="space-y-1">
        <div className="flex items-center gap-2">
          <span className="pulse-dot" />
          <span className="muted-small font-semibold uppercase tracking-wider">Live · 24/7</span>
        </div>
        <h1>Anu LCBO Tracker</h1>
        <p className="text-muted text-sm">
          Live distribution intelligence — monitored from SOD + LCBO.com.
        </p>
      </header>

      <FreshnessBanner />

      {/* SECTION 1: Brands — the most important thing */}
      <section className="space-y-2.5">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2">
            <Tag size={18} className="text-[var(--color-accent)]" /> Our Brands
          </h2>
          <Link
            href="/brands"
            className="text-sm text-[var(--color-accent)] flex items-center gap-1"
          >
            All <ChevronRight size={14} />
          </Link>
        </div>
        {brands.isLoading &&
          Array.from({ length: 3 }).map((_, i) => <div key={i} className="skeleton h-28" />)}
        {brands.data?.brands.map((b) => (
          <Link
            key={b.brand}
            href={`/brands/${encodeURIComponent(b.slug)}`}
            className="m-card block"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="!text-base">{b.brand}</h3>
                  <span className="text-xs text-muted">{b.sku_count} SKUs</span>
                </div>
                <div className="text-xs text-muted truncate">
                  {b.skus.map((s) => s.product_name).join(' · ')}
                </div>
              </div>
              <ChevronRight size={16} className="text-muted shrink-0" />
            </div>
            <div className="grid grid-cols-4 gap-1.5 mt-3 pt-3 border-t border-[var(--color-card-border)]">
              <KpiCell label="Stores" value={b.total_stores} />
              <KpiCell label="Listed" value={b.total_listed} color="var(--color-success)" />
              <KpiCell
                label="Delisting"
                value={b.total_delisting}
                color={b.total_delisting > 0 ? 'var(--color-warning)' : 'var(--color-muted)'}
              />
              <KpiCell
                label="New 60d"
                value={b.additions_60d}
                color={b.additions_60d > 0 ? 'var(--color-accent)' : 'var(--color-muted)'}
                icon={b.additions_60d > 0 ? <TrendingUp size={11} /> : undefined}
              />
            </div>
          </Link>
        ))}
      </section>

      {/* SECTION 2: Today's plan (if rep selected) */}
      {activeRep && today.data && today.data.stops.length > 0 && (
        <section className="space-y-2.5">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2">
              <Calendar size={18} className="text-[var(--color-accent)]" /> Your day · {activeRep}
            </h2>
            <Link href="/today" className="text-sm text-[var(--color-accent)] flex items-center gap-1">
              All stops <ChevronRight size={14} />
            </Link>
          </div>
          <div className="grid grid-cols-3 gap-2.5">
            <Stat label="Stops" value={today.data.total_stops} />
            <Stat label="Drive" value={`${today.data.total_distance_km}km`} />
            <Stat label="Open" value={today.data.overdue_deal_actions} />
          </div>
          <div className="space-y-2">
            {today.data.stops.slice(0, 3).map((s, i) => (
              <Link
                key={s.store_id}
                href={`/stores/${s.store_number}`}
                className="m-card flex items-center gap-3"
              >
                <div
                  className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm border-2"
                  style={{ borderColor: 'var(--color-accent)', color: 'var(--color-accent)' }}
                >
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm truncate">
                    #{s.store_number} · {s.account}
                  </div>
                  <div className="text-xs text-muted truncate">
                    {s.city} ·{' '}
                    {s.days_since_visit != null
                      ? `last visit ${s.days_since_visit}d ago`
                      : 'never visited'}
                  </div>
                </div>
                {s.oos_count > 0 && (
                  <span className="change-chip change-DELISTED">{s.oos_count} OOS</span>
                )}
              </Link>
            ))}
          </div>
        </section>
      )}

      {!activeRep && (
        <Link href="/today" className="m-card flex items-center gap-3">
          <Calendar size={20} className="text-[var(--color-accent)]" />
          <div className="flex-1">
            <div className="font-semibold text-sm">Set your active rep</div>
            <div className="text-xs text-muted">
              Pick yourself in /today → see today&apos;s ranked stops
            </div>
          </div>
          <ChevronRight size={16} className="text-muted" />
        </Link>
      )}

      {/* SECTION 3: New Distribution Wins (the user explicitly asked) */}
      <section className="space-y-2.5">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2">
            <TrendingUp size={18} style={{ color: 'var(--color-success)' }} />
            New Distribution
          </h2>
          <Link
            href="/intel"
            className="text-sm text-[var(--color-accent)] flex items-center gap-1"
          >
            All 60d <ChevronRight size={14} />
          </Link>
        </div>
        <p className="text-xs text-muted -mt-1">
          Stores that ADDED our SKUs in the last 60 days.
        </p>
        {additions.isLoading && <div className="skeleton h-32" />}
        {additions.data?.per_sku && additions.data.per_sku.length > 0 && (
          <div className="grid grid-cols-2 gap-2.5">
            {additions.data.per_sku.slice(0, 4).map((p) => (
              <Link
                key={p.sku}
                href={`/skus/${p.sku}`}
                className="m-card"
              >
                <div className="text-xs text-muted truncate">{p.product_name}</div>
                <div className="flex items-baseline gap-2 mt-1">
                  <span
                    className="text-2xl font-bold tabular-nums"
                    style={{ color: 'var(--color-accent)' }}
                  >
                    {p.count}
                  </span>
                  <span className="text-xs text-muted">new stores</span>
                </div>
                <div className="text-[10px] text-muted mt-1">
                  {p.still_listed} still on shelf · {p.lost_again} lost
                </div>
              </Link>
            ))}
          </div>
        )}
        {additions.data?.additions && additions.data.additions.length > 0 && (
          <div className="space-y-2">
            {additions.data.additions.slice(0, 3).map((a, i) => (
              <Link
                key={i}
                href={`/stores/${a.store_number}`}
                className="m-card block"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-muted">
                      {formatDate(a.change_date)} · {a.brand}
                    </div>
                    <div className="font-medium text-sm truncate">
                      #{a.store_number} · {a.account}
                    </div>
                    <div className="text-xs text-muted truncate">
                      {a.product_name} · {a.city}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    {a.current_status && (
                      <span className={statusBadgeClass(a.current_status)}>
                        {statusLabel(a.current_status)}
                      </span>
                    )}
                    <div className="text-xs text-muted mt-1">{a.current_on_hand} on hand</div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* SECTION 4: Critical alerts */}
      <section className="grid grid-cols-2 gap-2.5">
        <Link href="/oos" className="m-card">
          <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-muted font-semibold">
            <span>OOS Risk</span>
            <AlertTriangle size={14} style={{ color: 'var(--color-danger)' }} />
          </div>
          <div
            className="text-3xl font-bold mt-1.5 tabular-nums"
            style={{ color: 'var(--color-danger)' }}
          >
            {dash.isLoading ? (
              <span className="skeleton inline-block h-7 w-12" />
            ) : (
              formatNumber(dash.data?.oos_brink_count ?? 0)
            )}
          </div>
          <div className="text-xs text-muted mt-1">≤ 2 units</div>
        </Link>
        <Link href="/intel" className="m-card">
          <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-muted font-semibold">
            <span>Delisted 7d</span>
            <TrendingDown size={14} style={{ color: 'var(--color-warning)' }} />
          </div>
          <div
            className="text-3xl font-bold mt-1.5 tabular-nums"
            style={{ color: 'var(--color-warning)' }}
          >
            {digest.isLoading ? (
              <span className="skeleton inline-block h-7 w-12" />
            ) : (
              digest.data?.counts.find((c) => c.change_type === 'DELISTED')?.count ?? 0
            )}
          </div>
          <div className="text-xs text-muted mt-1">All LCBO SKUs</div>
        </Link>
      </section>

      {/* SECTION 5: Recent listing changes */}
      {recentChanges.length > 0 && (
        <section className="space-y-2.5">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2">
              <ActivityIcon size={18} className="text-[var(--color-accent)]" /> Recent changes
            </h2>
            <Link
              href="/intel"
              className="text-sm text-[var(--color-accent)] flex items-center gap-1"
            >
              All <ChevronRight size={14} />
            </Link>
          </div>
          <div className="space-y-2">
            {recentChanges.map((c, i) => (
              <div
                key={i}
                className={`m-card ${c.is_tracked ? 'border-[var(--color-accent)]/40' : ''}`}
              >
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
                    <div className="mt-1.5 font-medium text-sm truncate">
                      {c.product_name || <span className="text-muted">Unknown</span>}
                    </div>
                  </div>
                  <div className="text-xs text-muted shrink-0">{relativeTime(c.change_date)}</div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* SECTION 6: Quick actions */}
      <section className="space-y-2.5">
        <h2>Quick Actions</h2>
        <div className="grid grid-cols-2 gap-2.5">
          <QuickAction
            href="/log"
            icon={<Plus size={20} />}
            label="Log Visit"
            color="var(--color-primary)"
          />
          <QuickAction
            href="/today"
            icon={<Calendar size={20} />}
            label="Today's Plan"
            color="var(--color-accent)"
          />
          <QuickAction
            href="/pipeline"
            icon={<Target size={20} />}
            label="Pipeline"
            color="#f59e0b"
          />
          <QuickAction
            href="/nearby"
            icon={<Navigation size={20} />}
            label="Nearby"
            color="var(--color-success)"
          />
          <QuickAction
            href="/ask"
            icon={<Sparkles size={20} />}
            label="Ask AI"
            color="#a78bfa"
          />
          <QuickAction
            href="/intel"
            icon={<ActivityIcon size={20} />}
            label="Listings Feed"
            color="#74b9ff"
          />
        </div>
      </section>
    </div>
  );
}

function KpiCell({
  label,
  value,
  color,
  icon,
}: {
  label: string;
  value: string | number;
  color?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-muted font-semibold">{label}</div>
      <div
        className="text-base font-bold tabular-nums mt-0.5 flex items-center gap-1"
        style={{ color: color ?? 'var(--color-foreground)' }}
      >
        {icon}
        {value}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="m-card text-center">
      <div className="text-[10px] uppercase tracking-wider text-muted font-semibold">{label}</div>
      <div className="text-2xl font-bold mt-1 tabular-nums">{value}</div>
    </div>
  );
}

function QuickAction({
  href,
  icon,
  label,
  color,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  color: string;
}) {
  return (
    <Link href={href} className="m-card flex items-center gap-3 min-h-[64px]">
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: color + '22', color }}
      >
        {icon}
      </div>
      <div className="font-semibold truncate">{label}</div>
    </Link>
  );
}
