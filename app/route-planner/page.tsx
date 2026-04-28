'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import {
  Route,
  MapPin,
  Navigation,
  Loader2,
  Phone,
  User,
  Calendar,
  Filter,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useActiveRep } from '@/lib/active-rep';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FreshnessBanner } from '@/components/freshness-banner';

/**
 * Route Planner — pick a day + city + brand → get optimized route through stores
 * with 0-or-1 of our SKUs listed (highest-priority targets). One-tap directions.
 */
export default function RoutePlannerPage() {
  const [city, setCity] = useState('');
  const [district, setDistrict] = useState('');
  const [brand, setBrand] = useState<'all' | 'NB Distillers' | 'Anu Import'>('NB Distillers');
  const [maxSkus, setMaxSkus] = useState(1);
  const [maxStops, setMaxStops] = useState(8);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [coordsError, setCoordsError] = useState('');
  const [activeRep] = useActiveRep();

  const cities = useQuery({ queryKey: ['cities'], queryFn: api.cities });
  const territories = useQuery({ queryKey: ['territories'], queryFn: api.crmTerritories });

  const route = useQuery({
    queryKey: ['route', city, district, brand, maxSkus, maxStops, coords],
    queryFn: () =>
      api.routePlanner({
        city: city || undefined,
        district: district || undefined,
        brand: brand === 'all' ? undefined : brand,
        max_skus_listed: maxSkus,
        max_stops: maxStops,
        start_lat: coords?.lat,
        start_lng: coords?.lng,
      }),
    enabled: !!city || !!district,
  });

  function getGPS() {
    if (!('geolocation' in navigator)) {
      setCoordsError('Geolocation not supported');
      return;
    }
    setCoordsError('');
    navigator.geolocation.getCurrentPosition(
      (pos) => setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => setCoordsError(err.message),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  function multiStopGoogleMapsUrl(): string | null {
    if (!route.data?.route || route.data.route.length === 0) return null;
    // Build a multi-waypoint Google Maps directions URL
    const stops = route.data.route;
    const origin = coords ? `${coords.lat},${coords.lng}` : `${stops[0].lat},${stops[0].lng}`;
    const destination = `${stops[stops.length - 1].lat},${stops[stops.length - 1].lng}`;
    const waypoints =
      stops.length > 2
        ? `&waypoints=${stops.slice(0, -1).map((s) => `${s.lat},${s.lng}`).join('|')}`
        : '';
    return `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}${waypoints}`;
  }

  const mapUrl = multiStopGoogleMapsUrl();

  return (
    <div className="space-y-4 pb-6">
      <header className="space-y-1">
        <div className="flex items-center gap-2">
          <Route size={16} className="text-[var(--color-accent)]" />
          <span className="muted-small font-semibold uppercase tracking-wider">Route planner</span>
        </div>
        <h1>Build Today&apos;s Route</h1>
        <p className="text-muted text-sm">
          Pick a city or district. Get a TSP-optimized route through priority stores
          (0-or-1 of our SKUs listed). One tap → Google Maps multi-stop directions.
        </p>
      </header>

      <FreshnessBanner />

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>
            {activeRep ? `Routing for ${activeRep}.` : 'Pick a rep on /today first.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Field label="City">
            <select
              value={city}
              onChange={(e) => {
                setCity(e.target.value);
                setDistrict('');
              }}
              className="select"
            >
              <option value="">— pick a city —</option>
              {cities.data?.map((c) => (
                <option key={c.city} value={c.city}>
                  {c.city} ({c.store_count})
                </option>
              ))}
            </select>
          </Field>
          <Field label="OR Territory/District">
            <select
              value={district}
              onChange={(e) => {
                setDistrict(e.target.value);
                setCity('');
              }}
              className="select"
            >
              <option value="">— pick a territory —</option>
              {territories.data?.map((t) => (
                <option key={t.id} value={t.name}>
                  {t.name} ({t.store_count})
                </option>
              ))}
            </select>
          </Field>
          <div className="grid grid-cols-3 gap-2">
            <Field label="Brand">
              <select
                value={brand}
                onChange={(e) => setBrand(e.target.value as typeof brand)}
                className="select"
              >
                <option value="NB Distillers">NB Distillers</option>
                <option value="Anu Import">Anu Import</option>
                <option value="all">All tracked</option>
              </select>
            </Field>
            <Field label="Max SKUs at store">
              <select
                value={maxSkus}
                onChange={(e) => setMaxSkus(Number(e.target.value))}
                className="select"
              >
                <option value={0}>0 (gap stores only)</option>
                <option value={1}>≤ 1 (priority)</option>
                <option value={2}>≤ 2</option>
                <option value={99}>any</option>
              </select>
            </Field>
            <Field label="Max stops">
              <select
                value={maxStops}
                onChange={(e) => setMaxStops(Number(e.target.value))}
                className="select"
              >
                <option value={5}>5</option>
                <option value={8}>8</option>
                <option value={12}>12</option>
                <option value={20}>20</option>
              </select>
            </Field>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="secondary" onClick={getGPS}>
              <MapPin size={14} />
              {coords ? 'Re-pin location' : 'Use my location'}
            </Button>
            {coords && (
              <span className="text-xs text-muted font-mono">
                {coords.lat.toFixed(3)}, {coords.lng.toFixed(3)}
              </span>
            )}
            {coordsError && (
              <span className="text-xs text-[var(--color-warning)]">{coordsError}</span>
            )}
          </div>
        </CardContent>
      </Card>

      {!city && !district && (
        <div className="m-card text-center py-8 text-muted text-sm">
          Pick a city or territory to build a route.
        </div>
      )}

      {(city || district) && (
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-2 flex-wrap">
              <div>
                <CardTitle>
                  {route.data?.total_stops ?? 0} stops · {route.data?.total_distance_km ?? 0} km
                </CardTitle>
                <CardDescription>
                  {route.data?.total_candidates ?? 0} candidate stores in {city || district}.
                  Sorted by SKUs-listed (zero first), then nearest-neighbor from{' '}
                  {coords ? 'your GPS' : 'first stop'}.
                </CardDescription>
              </div>
              {mapUrl && (
                <a
                  href={mapUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 h-10 px-3 rounded-lg bg-[var(--color-accent)] text-[#2a1f0f] text-sm font-semibold"
                >
                  <Navigation size={14} /> Open in Google Maps
                </a>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {route.isLoading && (
                <div className="py-6 text-center text-muted text-sm">
                  <Loader2 size={16} className="animate-spin inline mr-2" />
                  Optimizing route…
                </div>
              )}
              {route.data?.route.length === 0 && !route.isLoading && (
                <div className="py-12 text-center text-muted text-sm">
                  No matching stores. Try widening the filters or picking a different city.
                </div>
              )}
              {route.data?.route.map((s, i) => (
                <div key={s.store_id} className="m-card">
                  <div className="flex items-start gap-3">
                    <div
                      className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm border-2"
                      style={{
                        borderColor: 'var(--color-accent)',
                        color: 'var(--color-accent)',
                      }}
                    >
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap mb-1">
                        <span
                          className="change-chip"
                          style={{
                            background: s.territory_color + '33',
                            color: s.territory_color,
                          }}
                        >
                          {s.territory_name || 'Unassigned'}
                        </span>
                        {s.skus_listed === 0 && (
                          <span className="change-chip change-DELISTED">0 SKUs</span>
                        )}
                        {s.skus_listed === 1 && (
                          <span className="change-chip change-STATUS_FLIP">1 SKU</span>
                        )}
                        {s.priority && s.priority !== 'Standard' && (
                          <span className="change-chip change-BASELINE">{s.priority}</span>
                        )}
                      </div>
                      <Link
                        href={`/stores/${s.store_number}`}
                        className="font-semibold text-base hover:text-[var(--color-accent)] block"
                      >
                        #{s.store_number} · {s.account}
                      </Link>
                      <div className="text-xs text-muted">
                        {s.address}, {s.city} {s.postal}
                      </div>
                      {s.manager_name && (
                        <div className="text-xs text-muted mt-1 flex items-center gap-1">
                          <User size={11} />
                          {s.manager_name}
                          {s.manager_phone && (
                            <a
                              href={`tel:${s.manager_phone.replace(/[^0-9+]/g, '')}`}
                              className="ml-1 text-[var(--color-accent)] flex items-center gap-0.5"
                            >
                              <Phone size={11} /> {s.manager_phone}
                            </a>
                          )}
                        </div>
                      )}
                      <div className="text-[10px] text-muted mt-1">
                        Leg distance: {s.leg_distance_km} km
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-3 pt-3 border-t border-[var(--color-card-border)]">
                    <Link
                      href={`/log?store=${s.store_number}${activeRep ? `&rep=${encodeURIComponent(activeRep)}` : ''}`}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 h-10 rounded-lg bg-[var(--color-primary)] text-white text-sm font-semibold"
                    >
                      Log Visit
                    </Link>
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${s.lat},${s.lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-1.5 h-10 px-3 rounded-lg bg-[var(--color-card)] border border-[var(--color-card-border)] text-sm"
                    >
                      <Navigation size={14} /> Drive
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs uppercase tracking-wider text-muted font-semibold mb-1">
        {label}
      </span>
      {children}
    </label>
  );
}
