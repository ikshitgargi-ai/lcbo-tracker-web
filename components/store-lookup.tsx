'use client';

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Phone, MapPin, User, Loader2, CheckCircle2 } from 'lucide-react';
import { api } from '@/lib/api';

/**
 * Store number input that resolves to full store details (name, address, phone,
 * manager) on debounced lookup. Used in the Quick-Log sheet so reps don't have
 * to memorize what "Store 444" is.
 */
export function StoreLookup({
  value,
  onChange,
  onResolved,
  placeholder = 'e.g. 217',
}: {
  value: string;
  onChange: (v: string) => void;
  onResolved?: (store: { store_number: number; account: string; address: string; city: string; phone: string; manager_name: string } | null) => void;
  placeholder?: string;
}) {
  const [debounced, setDebounced] = useState('');

  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), 250);
    return () => clearTimeout(id);
  }, [value]);

  const n = parseInt(debounced, 10);
  const enabled = Number.isFinite(n) && n > 0;

  const lookup = useQuery({
    queryKey: ['store-full', n],
    queryFn: () => api.storeFull(n),
    enabled,
    retry: false,
  });

  useEffect(() => {
    if (!enabled) {
      onResolved?.(null);
      return;
    }
    if (lookup.data?.store) {
      const s = lookup.data.store;
      onResolved?.({
        store_number: s.store_number,
        account: s.account ?? '',
        address: s.address ?? '',
        city: s.city ?? '',
        phone: s.manager_phone || s.phone || '',
        manager_name: s.manager_name ?? '',
      });
    } else if (lookup.error) {
      onResolved?.(null);
    }
  }, [enabled, lookup.data, lookup.error, onResolved]);

  return (
    <div>
      <input
        type="number"
        inputMode="numeric"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="select"
      />
      {enabled && (
        <div className="mt-2 p-2.5 rounded-lg bg-[var(--color-background)] border border-[var(--color-card-border)] text-xs">
          {lookup.isLoading && (
            <div className="flex items-center gap-2 text-muted">
              <Loader2 size={12} className="animate-spin" /> Looking up…
            </div>
          )}
          {lookup.error && (
            <div className="text-[var(--color-warning)]">Store #{n} not found in CRM.</div>
          )}
          {lookup.data?.store && (
            <div className="space-y-1">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 size={12} className="text-[var(--color-success)]" />
                <span className="font-semibold text-sm">
                  #{lookup.data.store.store_number} · {lookup.data.store.account || '—'}
                </span>
              </div>
              {lookup.data.store.address && (
                <div className="flex items-start gap-1.5 text-muted">
                  <MapPin size={11} className="shrink-0 mt-0.5" />
                  <span>
                    {lookup.data.store.address}, {lookup.data.store.city ?? ''}{' '}
                    {lookup.data.store.postal ?? ''}
                  </span>
                </div>
              )}
              {(lookup.data.store.manager_phone || lookup.data.store.phone) && (
                <div className="flex items-center gap-1.5 text-muted">
                  <Phone size={11} />
                  <a
                    href={`tel:${(lookup.data.store.manager_phone || lookup.data.store.phone).replace(/[^0-9+]/g, '')}`}
                    className="text-[var(--color-accent)]"
                  >
                    {lookup.data.store.manager_phone || lookup.data.store.phone}
                  </a>
                </div>
              )}
              {lookup.data.store.manager_name && (
                <div className="flex items-center gap-1.5 text-muted">
                  <User size={11} />
                  <span>Manager: {lookup.data.store.manager_name}</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
