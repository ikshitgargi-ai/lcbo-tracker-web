'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { MapPin, Navigation, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatNumber, statusBadgeClass, statusLabel } from '@/lib/utils';

export default function NearbyPage() {
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [error, setError] = useState<string>('');
  const [radius, setRadius] = useState(15);
  const [sku, setSku] = useState<string>('');
  const [gettingLocation, setGettingLocation] = useState(false);

  const trackedProducts = useQuery({
    queryKey: ['sod-products', true],
    queryFn: () => api.sodProducts(true),
  });
  const tracked = trackedProducts.data?.products ?? trackedProducts.data?.rows ?? [];

  const nearby = useQuery({
    queryKey: ['nearby', coords?.lat, coords?.lng, radius, sku],
    queryFn: () =>
      api.nearby({
        lat: coords!.lat,
        lng: coords!.lng,
        radius_km: radius,
        sku: sku || undefined,
        limit: 50,
      }),
    enabled: !!coords,
  });

  function getGPS() {
    if (!('geolocation' in navigator)) {
      setError('Geolocation not supported by this browser');
      return;
    }
    setGettingLocation(true);
    setError('');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGettingLocation(false);
      },
      (err) => {
        setError(`Location error: ${err.message}`);
        setGettingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 },
    );
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl sm:text-3xl font-semibold flex items-center gap-2">
          <Navigation size={24} className="text-[var(--color-accent)]" />
          Nearby Stores
        </h1>
        <p className="text-sm text-[var(--color-muted)]">
          Find LCBOs close to your current location, sorted by distance. Pick a SKU to see
          opportunity scores at each store.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Location</CardTitle>
          <CardDescription>
            One tap to get your current position. Browser will ask for permission.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!coords ? (
            <Button onClick={getGPS} disabled={gettingLocation}>
              {gettingLocation ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <MapPin size={16} />
              )}
              {gettingLocation ? 'Getting location…' : 'Use my location'}
            </Button>
          ) : (
            <div className="space-y-3">
              <div className="text-sm">
                <span className="text-[var(--color-muted)]">Your position:</span>{' '}
                <span className="font-mono tabular-nums">
                  {coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label={`Radius: ${radius} km`}>
                  <input
                    type="range"
                    min={1}
                    max={50}
                    value={radius}
                    onChange={(e) => setRadius(Number(e.target.value))}
                    className="w-full"
                  />
                </Field>
                <Field label="Focus SKU">
                  <select
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                    className="select"
                  >
                    <option value="">No SKU focus</option>
                    {tracked.map((p) => (
                      <option key={p.sku} value={p.sku}>
                        {p.brand} {p.product_name}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
              <Button variant="secondary" size="sm" onClick={getGPS}>
                <MapPin size={14} /> Refresh location
              </Button>
            </div>
          )}
          {error && <div className="mt-3 text-sm text-[var(--color-danger)]">{error}</div>}
        </CardContent>
      </Card>

      {coords && (
        <Card>
          <CardHeader>
            <CardTitle>
              {nearby.data?.results.length ?? 0} stores within {radius} km
            </CardTitle>
            {sku && (
              <CardDescription>Showing opportunity scores for SKU {sku}.</CardDescription>
            )}
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {nearby.data?.results.map((s) => (
                <div
                  key={s.id}
                  className="flex items-start gap-3 p-3 rounded-lg border border-[var(--color-card-border)] bg-white/[0.02]"
                >
                  <div
                    className="w-1 self-stretch rounded-full flex-shrink-0"
                    style={{ background: s.territory_color }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Link
                        href={`/stores/${s.store_number}`}
                        className="font-medium hover:text-[var(--color-accent)]"
                      >
                        #{s.store_number} {s.account}
                      </Link>
                      <span className="text-xs text-[var(--color-muted)]">
                        {s.distance_km} km
                      </span>
                      {sku && s.sku_status && (
                        <span className={statusBadgeClass(s.sku_status)}>
                          {statusLabel(s.sku_status)}
                          {s.sku_on_hand != null ? ` · ${s.sku_on_hand}` : ''}
                        </span>
                      )}
                      {sku && !s.sku_status && (
                        <span className="badge badge-delisting">Not Listed</span>
                      )}
                    </div>
                    <div className="text-xs text-[var(--color-muted)] mt-1">
                      {s.address}, {s.city} · {s.territory_name} · Rep: {s.rep || '—'}
                    </div>
                    {s.opportunity_score != null && sku && (
                      <div className="text-xs mt-1">
                        <span className="text-[var(--color-muted)]">Opportunity score: </span>
                        <span
                          className="font-semibold"
                          style={{
                            color:
                              (s.opportunity_score ?? 0) >= 50
                                ? 'var(--color-danger)'
                                : (s.opportunity_score ?? 0) >= 25
                                  ? 'var(--color-warning)'
                                  : 'var(--color-muted)',
                          }}
                        >
                          {s.opportunity_score}
                        </span>
                      </div>
                    )}
                  </div>
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${s.lat},${s.lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="self-center shrink-0 text-xs text-[var(--color-accent)] hover:underline"
                  >
                    Directions →
                  </a>
                </div>
              ))}
              {nearby.isLoading && (
                <div className="py-4 text-center text-[var(--color-muted)]">
                  <Loader2 size={18} className="animate-spin inline" /> Finding stores…
                </div>
              )}
              {nearby.data?.results.length === 0 && (
                <div className="py-8 text-center text-[var(--color-muted)]">
                  No stores within {radius} km. Try a larger radius.
                </div>
              )}
            </div>
            {!sku && formatNumber(nearby.data?.total_within_radius ?? 0) !== '0' && (
              <div className="mt-3 text-xs text-[var(--color-muted)]">
                Total in radius: {formatNumber(nearby.data?.total_within_radius ?? 0)} (showing
                top 50 closest)
              </div>
            )}
          </CardContent>
        </Card>
      )}
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
