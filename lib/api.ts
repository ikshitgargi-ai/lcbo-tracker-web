/**
 * API client for the Flask backend.
 *
 * Base URL:
 *   - Production: NEXT_PUBLIC_API_BASE (e.g. https://lcbo-tracker.onrender.com)
 *   - Dev: set in .env.local, defaults to https://lcbo-tracker.onrender.com
 *
 * All report endpoints return payloads with a `freshness` object:
 *   { latest_snapshot, snapshot_age_days, is_stale, last_run_age_hours }
 * Use <FreshnessBanner> to surface stale data to the user.
 */

export const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE ?? 'https://lcbo-tracker.onrender.com';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const r = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });
  if (!r.ok) {
    let detail = '';
    try {
      detail = (await r.json())?.error ?? (await r.text());
    } catch {
      /* ignore */
    }
    throw new Error(`${r.status} ${r.statusText}: ${detail || path}`);
  }
  return r.json();
}

export const api = {
  // ===== Freshness / health =====
  sodHealth: () => request<SodHealth>('/api/sod/health'),
  healthz: () => request<HealthzPayload>('/healthz'),
  sodStatus: () => request<SodStatus>('/api/sod/status'),
  sodRefreshSnapshot: () =>
    request<{ status: string; sources: string[] }>('/api/sod/refresh-snapshot', { method: 'POST' }),
  sodSync: () => request<unknown>('/api/sod/sync', { method: 'POST' }),

  // ===== Reports =====
  reportDaily: (date?: string) =>
    request<ReportPayload>(`/api/reports/daily${date ? `?date=${date}` : ''}`),
  reportWeekly: (end?: string, mode?: 'mon-sun' | 'rolling7') =>
    request<ReportPayload>(
      `/api/reports/weekly${end || mode ? '?' : ''}${end ? `end=${end}` : ''}${
        end && mode ? '&' : ''
      }${mode ? `mode=${mode}` : ''}`,
    ),
  reportMonthly: (end?: string) =>
    request<ReportPayload>(`/api/reports/monthly${end ? `?end=${end}` : ''}`),
  reportRep: () => request<RepReportPayload>(`/api/reports/rep`),

  // ===== CRM =====
  crmDashboard: () => request<CrmDashboard>('/api/crm/dashboard'),
  crmTerritories: () => request<Territory[]>('/api/crm/territories'),
  crmStores: (params: { territory_id?: number; with_coords_only?: boolean } = {}) => {
    const qs = new URLSearchParams();
    if (params.territory_id) qs.set('territory_id', String(params.territory_id));
    if (params.with_coords_only) qs.set('with_coords_only', '1');
    const s = qs.toString();
    return request<Store[]>(`/api/crm/stores${s ? `?${s}` : ''}`);
  },
  oosRisk: (params: { sku?: string; territory_id?: number; threshold?: number } = {}) => {
    const qs = new URLSearchParams();
    if (params.sku) qs.set('sku', params.sku);
    if (params.territory_id) qs.set('territory_id', String(params.territory_id));
    if (params.threshold != null) qs.set('threshold', String(params.threshold));
    const s = qs.toString();
    return request<OosRiskRow[]>(`/api/crm/oos-risk${s ? `?${s}` : ''}`);
  },
  opportunities: (params: {
    sku?: string;
    territory_id?: number;
    slow_threshold?: number;
    limit?: number;
  } = {}) => {
    const qs = new URLSearchParams();
    if (params.sku) qs.set('sku', params.sku);
    if (params.territory_id) qs.set('territory_id', String(params.territory_id));
    if (params.slow_threshold != null) qs.set('slow_threshold', String(params.slow_threshold));
    if (params.limit != null) qs.set('limit', String(params.limit));
    const s = qs.toString();
    return request<Opportunity[]>(`/api/crm/opportunities${s ? `?${s}` : ''}`);
  },
  listingDigest: (days = 14, trackedOnly = false) => {
    const qs = new URLSearchParams();
    qs.set('days', String(days));
    if (trackedOnly) qs.set('tracked_only', '1');
    return request<ListingDigestPayload>(`/api/crm/listing-digest?${qs.toString()}`);
  },
  goals: () => request<Goal[]>('/api/crm/goals'),
  goalsProgress: () => request<GoalProgress[]>('/api/crm/goals/progress'),
  horeca: (params: { territory_id?: number; status?: string; type?: string } = {}) => {
    const qs = new URLSearchParams();
    if (params.territory_id) qs.set('territory_id', String(params.territory_id));
    if (params.status) qs.set('status', params.status);
    if (params.type) qs.set('type', params.type);
    const s = qs.toString();
    return request<HorecaAccount[]>(`/api/crm/horeca${s ? `?${s}` : ''}`);
  },
  storeInventory: (storeNumber: number | string) =>
    request<StoreInventory>(`/api/crm/store/${storeNumber}/inventory`),

  // ===== Tracked products =====
  trackedProducts: () => request<ProductRow[]>('/api/products'),
  sodProducts: (tracked = true) =>
    request<SodProductsResponse>(`/api/sod/products${tracked ? '?tracked=1' : ''}`),
};

// ===== Types =====
export interface Freshness {
  latest_snapshot: string | null;
  snapshot_age_days: number | null;
  is_stale: boolean;
  last_run_age_hours: number | null;
}

export interface SodHealth extends Freshness {
  status: 'healthy' | 'stale' | 'never_synced';
  configured: boolean;
  scheduler_running?: boolean;
  snapshot_date?: string;
}

export interface HealthzPayload extends Freshness {
  status: 'healthy' | 'unhealthy';
}

export interface SodStatus {
  configured: boolean;
  agent_id?: string;
  recent_runs: SodRun[];
  last_by_source: { daily_a?: SodRun; daily_b?: SodRun };
  stats: {
    inv_rows: number;
    sku_count: number;
    snapshot_days: number;
    latest_snapshot: string | null;
    tracked_products: number;
  };
  freshness: Freshness;
  scheduler_running: boolean;
}

export interface SodRun {
  id: number;
  run_at: string;
  source: 'daily_a' | 'daily_b';
  file_name: string | null;
  snapshot_date: string | null;
  status: 'running' | 'success' | 'failed';
  total_rows: number;
  anu_rows: number;
  new_listings: number;
  new_delistings: number;
  duration_seconds: number;
  error: string | null;
}

export interface ReportPayload {
  window: {
    start: string;
    end: string;
    latest_snapshot: string | null;
    window_shifted: boolean;
    requested_window: { start: string; end: string };
  };
  freshness: Freshness;
  per_sku: Array<{
    sku: string;
    product_name: string;
    brand: string;
    day_count: number;
    avg_on_hand: number;
    latest_date: string;
    listed_store_days: number;
    delisting_store_days: number;
  }>;
  snapshot_metrics: Array<{
    sku: string;
    product_name: string;
    brand: string;
    store_count: number;
    total_on_hand: number;
    listed_stores: number;
    delisting_stores: number;
    fully_delisted_stores: number;
  }>;
  listing_changes: Array<{
    sku: string;
    product_name: string;
    brand: string;
    change_type: string;
    change_date: string;
    old_status: string | null;
    new_status: string | null;
  }>;
  totals: {
    products_tracked: number;
    changes_in_window: number;
    new_listings: number;
    delistings: number;
    relistings: number;
  };
}

export interface RepReportPayload {
  snapshot_date: string | null;
  reps: Array<{
    rep: string;
    total_stores: number;
    per_product: Array<{
      sku: string;
      brand: string;
      product_name: string;
      stores_carrying: number;
      stores_delisting: number;
      gap_count: number;
    }>;
  }>;
}

export interface CrmDashboard {
  latest_snapshot: string | null;
  tracked_sku_rollup: Array<{
    sku: string;
    brand: string;
    product_name: string;
    current_status: string;
    store_count: number;
    total_on_hand: number;
  }>;
  oos_brink_count: number;
  digest_last_7_days: Record<string, number>;
  territories: Array<{ code: string; name: string; color: string; store_count: number }>;
}

export interface Territory {
  id: number;
  code: string;
  name: string;
  region: string;
  rep_name: string;
  color: string;
  fsa_prefixes: string;
  city_prefixes: string;
  store_count: number;
  horeca_count: number;
}

export interface Store {
  id: number;
  store_number: number;
  account: string;
  address: string;
  city: string;
  postal: string;
  priority: string;
  rep: string;
  lat: number;
  lng: number;
  territory_id: number | null;
  territory_code: string;
  territory_name: string;
  territory_color: string;
}

export interface OosRiskRow {
  sku: string;
  product_name: string;
  store_number: number;
  status: string;
  on_hand: number;
  snapshot_date: string;
  store_id: number;
  account: string;
  city: string;
  postal: string;
  rep: string;
  territory_id: number | null;
  territory_code: string;
  territory_name: string;
  territory_color: string;
  severity: 'critical' | 'high' | 'medium';
}

export interface Opportunity {
  our_sku: string;
  our_brand: string;
  our_product: string;
  category: string;
  category_group: string;
  competitor_sku: string;
  competitor_name: string;
  competitor_status: string;
  competitor_on_hand: number;
  store_id: number;
  store_number: number;
  account: string;
  city: string;
  postal: string;
  rep: string;
  territory_id: number | null;
  territory_code: string;
  territory_name: string;
  territory_color: string;
  severity: string;
  opportunity_score: number;
}

export interface ListingDigestPayload {
  window_days: number;
  since: string;
  counts: Array<{ change_type: string; count: number }>;
  changes: Array<{
    sku: string;
    product_name: string;
    change_date: string;
    old_status: string | null;
    new_status: string | null;
    change_type: string;
    brand: string;
    is_tracked: boolean;
  }>;
}

export interface Goal {
  id: number;
  scope: 'sku' | 'territory' | 'rep';
  scope_key: string;
  period_start: string;
  period_end: string;
  target_units: number;
  target_revenue: number;
  target_listings: number;
  notes: string;
}

export interface GoalProgress extends Goal {
  achieved_units: number;
  achieved_listings: number;
  pct_units: number | null;
  pct_listings: number | null;
}

export interface HorecaAccount {
  id: number;
  name: string;
  account_type: string;
  address: string;
  city: string;
  postal: string;
  phone: string;
  email: string;
  contact_name: string;
  contact_title: string;
  territory_id: number | null;
  territory_name: string;
  territory_color: string;
  rep_name: string;
  status: string;
  priority: string;
  lat: number;
  lng: number;
  last_visit: string;
  next_visit: string;
  products_carried: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface StoreInventory {
  store_number: number;
  sod: Array<{
    sku: string;
    product_name: string;
    status: string;
    on_hand: number;
    snapshot_date: string;
    brand: string;
  }>;
  live: Array<{
    sku: string;
    brand: string;
    product_name: string;
    quantity: number;
    store_name: string;
    city: string;
    source: string;
    error?: string;
  }>;
}

export interface ProductRow {
  id: number;
  brand: string;
  name: string;
  lcbo_sku: string;
}

export interface SodProductsResponse {
  products?: Array<{ sku: string; product_name: string; brand: string }>;
  rows?: Array<{ sku: string; product_name: string; brand: string }>;
}
