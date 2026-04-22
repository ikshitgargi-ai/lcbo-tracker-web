'use client';

import { useQuery } from '@tanstack/react-query';
import { Globe2 } from 'lucide-react';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { formatNumber } from '@/lib/utils';

export default function TerritoriesPage() {
  const territories = useQuery({ queryKey: ['territories'], queryFn: api.crmTerritories });

  const grouped = (territories.data ?? []).reduce<Record<string, typeof territories.data>>(
    (acc, t) => {
      const r = t.region || 'Other';
      (acc[r] ??= [] as NonNullable<typeof territories.data>).push(t);
      return acc;
    },
    {},
  );

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl sm:text-3xl font-semibold flex items-center gap-2">
          <Globe2 size={24} className="text-[var(--color-accent)]" />
          Territories
        </h1>
        <p className="text-sm text-[var(--color-muted)]">
          Ontario LCBO stores grouped by FSA postal-code prefix. 10 territories + unassigned.
        </p>
      </header>

      {Object.entries(grouped).map(([region, terrs]) => (
        <div key={region}>
          <h2 className="text-lg font-semibold mb-3 text-[var(--color-muted)] uppercase text-xs tracking-widest">
            {region}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {terrs?.map((t) => (
              <Card
                key={t.id}
                className="relative overflow-hidden hover:border-[var(--color-accent)] transition-colors cursor-pointer"
              >
                <div
                  className="absolute top-0 left-0 right-0 h-1"
                  style={{ background: t.color }}
                />
                <CardHeader>
                  <CardTitle className="text-base">{t.name}</CardTitle>
                  <CardDescription className="font-mono text-[10px]">{t.code}</CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-[var(--color-muted)]">Stores</span>
                    <span className="font-semibold tabular-nums">{formatNumber(t.store_count)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-[var(--color-muted)]">HORECA</span>
                    <span className="font-semibold tabular-nums">{formatNumber(t.horeca_count)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-[var(--color-muted)]">Rep</span>
                    <span className="font-medium">{t.rep_name || '—'}</span>
                  </div>
                  {t.fsa_prefixes && (
                    <div className="text-[10px] text-[var(--color-muted)] font-mono mt-2 pt-2 border-t border-[var(--color-card-border)]">
                      FSA: {t.fsa_prefixes}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ))}

      {territories.isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="skeleton h-40" />
          ))}
        </div>
      )}
    </div>
  );
}
