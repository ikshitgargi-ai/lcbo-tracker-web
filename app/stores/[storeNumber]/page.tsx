'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { use, useState } from 'react';
import Link from 'next/link';
import {
  Phone,
  Mail,
  Navigation,
  ArrowLeft,
  Store as StoreIcon,
  CheckCircle,
  Plus,
  Activity as ActivityIcon,
  Target,
  Zap,
} from 'lucide-react';
import { toast } from 'sonner';
import { api, type DealStage } from '@/lib/api';
import { useActiveRep } from '@/lib/active-rep';
import { FreshnessBanner } from '@/components/freshness-banner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatNumber, formatDate, statusBadgeClass, statusLabel, relativeTime } from '@/lib/utils';

export default function StorePage({
  params,
}: {
  params: Promise<{ storeNumber: string }>;
}) {
  const { storeNumber } = use(params);
  const n = Number(storeNumber);
  const [activeRep] = useActiveRep();
  const qc = useQueryClient();
  const [tab, setTab] = useState<'overview' | 'replace' | 'activity' | 'deals'>('overview');

  const full = useQuery({ queryKey: ['store-full', n], queryFn: () => api.storeFull(n) });
  const inv = useQuery({ queryKey: ['store-inv', n], queryFn: () => api.storeInventory(n) });
  const replace = useQuery({
    queryKey: ['replace-targets', n],
    queryFn: () => api.replaceTargets(n),
  });
  const activity = useQuery({
    queryKey: ['activities', { store_number: n }],
    queryFn: () => api.activities({ store_number: n, days: 90 }),
  });
  const deals = useQuery({
    queryKey: ['deals', { store_number: n }],
    queryFn: () => api.deals({ store_number: n }),
  });

  const pitchDeal = useMutation({
    mutationFn: (body: { sku: string; competitor_sku: string; notes: string }) =>
      api.createDeal({
        store_number: n,
        sku: body.sku,
        stage: 'prospecting',
        owner_rep: activeRep ?? '',
        notes: `Pitch to replace competitor SKU ${body.competitor_sku}. ${body.notes}`,
        source: 'replace_targets',
      }),
    onSuccess: () => {
      toast.success('Pitch added to pipeline');
      qc.invalidateQueries({ queryKey: ['deals', { store_number: n }] });
    },
    onError: (err: unknown) => toast.error((err as Error).message),
  });

  const s = full.data?.store;
  const phone = s?.manager_phone || s?.phone || '';
  const email = s?.store_email || s?.email || '';

  return (
    <div className="space-y-4 pb-24">
      <Link
        href="/today"
        className="inline-flex items-center gap-1 text-sm text-muted hover:text-[var(--color-accent)]"
      >
        <ArrowLeft size={14} /> Back
      </Link>

      {/* Store header */}
      <Card>
        <CardContent className="pt-4">
          {full.isLoading && <div className="skeleton h-24" />}
          {s && (
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 text-xl font-bold"
                  style={{
                    background: s.territory_color + '33',
                    color: s.territory_color,
                  }}
                >
                  <StoreIcon size={22} />
                </div>
                <div className="flex-1 min-w-0">
                  <h1 className="!text-xl">#{s.store_number}</h1>
                  <div className="text-sm font-medium">{s.account}</div>
                  <div className="text-xs text-muted mt-0.5">
                    {s.address}, {s.city} {s.postal}
                  </div>
                  <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                    <span
                      className="change-chip"
                      style={{
                        background: s.territory_color + '33',
                        color: s.territory_color,
                      }}
                    >
                      {s.territory_name}
                    </span>
                    {s.priority && (
                      <span className="change-chip change-BASELINE">{s.priority}</span>
                    )}
                    {s.rep && (
                      <span className="change-chip change-STATUS_FLIP">Rep: {s.rep}</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="grid grid-cols-4 gap-1.5">
                <Link
                  href={`/log?store=${n}${activeRep ? `&rep=${encodeURIComponent(activeRep)}` : ''}`}
                  className="flex flex-col items-center justify-center gap-1 h-16 rounded-lg bg-[var(--color-primary)] text-white text-[11px] font-semibold"
                >
                  <Plus size={18} />
                  Log
                </Link>
                <a
                  href={phone ? `tel:${phone.replace(/[^0-9+]/g, '')}` : '#'}
                  onClick={(e) => {
                    if (!phone) {
                      e.preventDefault();
                      toast.info('No phone number on file');
                    }
                  }}
                  className="flex flex-col items-center justify-center gap-1 h-16 rounded-lg bg-[var(--color-card)] border border-[var(--color-card-border)] text-[11px] font-semibold"
                >
                  <Phone size={18} />
                  Call
                </a>
                <a
                  href={email ? `mailto:${email}` : '#'}
                  onClick={(e) => {
                    if (!email) {
                      e.preventDefault();
                      toast.info('No email on file');
                    }
                  }}
                  className="flex flex-col items-center justify-center gap-1 h-16 rounded-lg bg-[var(--color-card)] border border-[var(--color-card-border)] text-[11px] font-semibold"
                >
                  <Mail size={18} />
                  Email
                </a>
                <a
                  href={
                    s.lat && s.lng
                      ? `https://www.google.com/maps/dir/?api=1&destination=${s.lat},${s.lng}`
                      : '#'
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-col items-center justify-center gap-1 h-16 rounded-lg bg-[var(--color-card)] border border-[var(--color-card-border)] text-[11px] font-semibold"
                >
                  <Navigation size={18} />
                  Drive
                </a>
              </div>

              {/* Manager contact */}
              {(s.manager_name || s.manager_phone) && (
                <div className="text-xs text-muted pt-2 border-t border-[var(--color-card-border)]">
                  {s.manager_name && <span>Manager: {s.manager_name} · </span>}
                  {s.manager_phone && <span>{s.manager_phone}</span>}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <FreshnessBanner />

      {/* Tab strip */}
      <div className="flex gap-1.5 overflow-x-auto -mx-4 px-4 pb-1">
        {(
          [
            { key: 'overview', label: 'Our SKUs', icon: CheckCircle },
            { key: 'replace', label: 'Replace These', icon: Zap },
            { key: 'activity', label: 'Activity', icon: ActivityIcon },
            { key: 'deals', label: 'Pipeline', icon: Target },
          ] as const
        ).map((t) => {
          const Icon = t.icon;
          const sel = tab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`shrink-0 flex items-center gap-1.5 px-4 py-2.5 rounded-full text-sm font-semibold min-h-11 ${
                sel
                  ? 'bg-[var(--color-accent)] text-[#2a1f0f]'
                  : 'bg-[var(--color-card)] border border-[var(--color-card-border)]'
              }`}
            >
              <Icon size={14} />
              {t.label}
              {t.key === 'replace' && replace.data?.categories && replace.data.categories.length > 0 && (
                <span className="ml-1 text-xs opacity-70">
                  ({replace.data.categories.reduce((sum, c) => sum + c.targets.length, 0)})
                </span>
              )}
              {t.key === 'activity' && activity.data && (
                <span className="ml-1 text-xs opacity-70">({activity.data.activities.length})</span>
              )}
              {t.key === 'deals' && deals.data && (
                <span className="ml-1 text-xs opacity-70">({deals.data.deals.length})</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab: Our SKUs */}
      {tab === 'overview' && (
        <div className="space-y-2.5">
          {inv.isLoading &&
            Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton h-16" />)}
          {inv.data?.sod.map((s) => (
            <div key={s.sku} className="m-card">
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <Link
                    href={`/skus/${s.sku}`}
                    className="font-medium hover:text-[var(--color-accent)]"
                  >
                    {s.product_name}
                  </Link>
                  <div className="text-xs text-muted">
                    {s.brand} · <span className="font-mono">{s.sku}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={statusBadgeClass(s.status)}>{statusLabel(s.status)}</span>
                  <div className="text-right">
                    <div className="text-[10px] uppercase tracking-wider text-muted">on-hand</div>
                    <div className="font-bold tabular-nums">{formatNumber(s.on_hand)}</div>
                  </div>
                </div>
              </div>
            </div>
          ))}
          {inv.data?.sod.length === 0 && (
            <div className="m-card text-center text-muted py-6">
              None of our tracked SKUs are at this store right now.
            </div>
          )}
        </div>
      )}

      {/* Tab: Replace These */}
      {tab === 'replace' && (
        <div className="space-y-3">
          {replace.isLoading && <div className="skeleton h-32" />}
          {replace.data?.categories.length === 0 && (
            <div className="m-card text-center text-muted py-8">
              No competitor SKUs found in our categories at this store.
            </div>
          )}
          {replace.data?.categories.map((c) => (
            <Card key={c.category}>
              <CardHeader>
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <CardTitle className="text-base">{c.category}</CardTitle>
                    <CardDescription>
                      Pitch{' '}
                      <span className="text-[var(--color-accent)] font-semibold">
                        {c.pitch_our_brand} {c.pitch_our_product}
                      </span>
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {c.targets.map((t) => (
                  <div
                    key={t.competitor_sku}
                    className="flex items-center justify-between gap-3 p-3 rounded-lg bg-[var(--color-background)] border border-[var(--color-card-border)]"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap mb-1">
                        <span className={statusBadgeClass(t.competitor_status)}>
                          {statusLabel(t.competitor_status)}
                        </span>
                        <span
                          className="change-chip"
                          style={{
                            color:
                              t.opportunity_score >= 50
                                ? 'var(--color-danger)'
                                : t.opportunity_score >= 25
                                  ? 'var(--color-warning)'
                                  : 'var(--color-muted)',
                            background:
                              t.opportunity_score >= 50
                                ? 'rgba(239,75,75,0.15)'
                                : t.opportunity_score >= 25
                                  ? 'rgba(253,203,110,0.15)'
                                  : 'rgba(255,255,255,0.06)',
                          }}
                        >
                          score {t.opportunity_score}
                        </span>
                      </div>
                      <div className="text-sm truncate">{t.competitor_name}</div>
                      <div className="text-xs text-muted">
                        {t.competitor_brand} · <span className="font-mono">{t.competitor_sku}</span>{' '}
                        · {t.competitor_on_hand} on hand
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() =>
                        pitchDeal.mutate({
                          sku: c.pitch_our_sku,
                          competitor_sku: t.competitor_sku,
                          notes: `${t.competitor_brand} ${t.competitor_name} (${t.competitor_status}, ${t.competitor_on_hand} on hand)`,
                        })
                      }
                      disabled={pitchDeal.isPending}
                    >
                      Pitch
                    </Button>
                  </div>
                ))}
                {c.targets.length === 0 && (
                  <div className="text-xs text-muted text-center py-3">
                    No underperforming competitors in {c.category} at this store right now.
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Tab: Activity */}
      {tab === 'activity' && (
        <div className="space-y-2.5">
          {activity.isLoading && <div className="skeleton h-20" />}
          {activity.data?.activities.length === 0 && (
            <div className="m-card text-center text-muted py-6">No activity logged yet.</div>
          )}
          {activity.data?.activities.map((a) => (
            <div key={a.id} className="m-card">
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="change-chip change-BASELINE">{a.activity_type}</span>
                <span className="text-xs text-muted">{relativeTime(a.created_at)}</span>
              </div>
              {a.outcome && <div className="font-medium text-sm">{a.outcome}</div>}
              {a.notes && (
                <div className="text-xs text-muted mt-1 whitespace-pre-wrap">{a.notes}</div>
              )}
              <div className="text-xs text-muted mt-2 flex items-center gap-3 flex-wrap">
                {a.rep && <span>by {a.rep}</span>}
                {a.duration_minutes > 0 && <span>· {a.duration_minutes} min</span>}
                {a.rating > 0 && <span>· {'★'.repeat(a.rating)}</span>}
                {a.next_action && <span>· next: {a.next_action}</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tab: Deals */}
      {tab === 'deals' && (
        <div className="space-y-2.5">
          {deals.isLoading && <div className="skeleton h-20" />}
          {deals.data?.deals.length === 0 && (
            <div className="m-card text-center text-muted py-6">
              No open deals at this store yet.
            </div>
          )}
          {deals.data?.deals.map((d) => (
            <div key={d.id} className="m-card">
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="change-chip change-STATUS_FLIP">{d.stage}</span>
                <span className="text-xs text-muted">{d.probability}% confidence</span>
              </div>
              <div className="font-semibold">
                {d.brand} {d.product_name}
              </div>
              <div className="text-xs text-muted">
                <span className="font-mono">{d.sku}</span> · owner: {d.owner_rep || '—'}
              </div>
              {d.next_action && (
                <div className="text-xs mt-2 p-2 rounded bg-[var(--color-background)] border border-[var(--color-card-border)]">
                  <strong>Next:</strong> {d.next_action}
                  {d.next_action_date && (
                    <span className="text-muted"> · by {formatDate(d.next_action_date)}</span>
                  )}
                </div>
              )}
              {d.notes && (
                <div className="text-xs text-muted mt-1.5 whitespace-pre-wrap">{d.notes}</div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
