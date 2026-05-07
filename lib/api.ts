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

  // ===== Sprint 2: drill-down + comparison + GPS + AI =====
  skuTrend: (sku: string, days = 90) =>
    request<SkuTrend>(`/api/crm/sku-trend/${sku}?days=${days}`),
  storeTrend: (storeNumber: number | string, days = 90) =>
    request<StoreTrend>(`/api/crm/store-trend/${storeNumber}?days=${days}`),
  wowDeltas: () => request<WowDeltasPayload>('/api/crm/wow-deltas'),
  nearby: (params: {
    lat: number;
    lng: number;
    radius_km?: number;
    limit?: number;
    sku?: string;
  }) => {
    const qs = new URLSearchParams();
    qs.set('lat', String(params.lat));
    qs.set('lng', String(params.lng));
    if (params.radius_km != null) qs.set('radius_km', String(params.radius_km));
    if (params.limit != null) qs.set('limit', String(params.limit));
    if (params.sku) qs.set('sku', params.sku);
    return request<NearbyPayload>(`/api/crm/nearby?${qs.toString()}`);
  },
  aiAsk: (question: string) =>
    request<AiAskPayload>('/api/ai/ask', {
      method: 'POST',
      body: JSON.stringify({ question }),
    }),

  // ===== Movement (authoritative store + listing counts) =====
  movement: (params: { start?: string; end?: string; sku?: string; tracked_only?: boolean } = {}) => {
    const qs = new URLSearchParams();
    if (params.start) qs.set('start', params.start);
    if (params.end) qs.set('end', params.end);
    if (params.sku) qs.set('sku', params.sku);
    if (params.tracked_only === false) qs.set('tracked_only', '0');
    return request<MovementPayload>(`/api/admin/movement?${qs.toString()}`);
  },

  // ===== Source-drift (UNION of SOD + lcbo.com + master + rep observations) =====
  storeUniverse: (params: { lcbo_hours?: number; verbose?: boolean } = {}) => {
    const qs = new URLSearchParams();
    if (params.lcbo_hours != null) qs.set('lcbo_hours', String(params.lcbo_hours));
    if (params.verbose) qs.set('verbose', '1');
    return request<StoreUniversePayload>(`/api/admin/store-universe?${qs.toString()}`);
  },

  // ===== Commission audit + rep observation override =====
  commissionAudit: (params: { sku?: string; days?: number; include_matches?: boolean } = {}) => {
    const qs = new URLSearchParams();
    if (params.sku) qs.set('sku', params.sku);
    if (params.days != null) qs.set('days', String(params.days));
    if (params.include_matches) qs.set('include_matches', '1');
    return request<CommissionAuditPayload>(`/api/admin/commission-audit?${qs.toString()}`);
  },
  observeListing: (body: {
    sku: string;
    store_number: number;
    rep: string;
    on_shelf?: boolean;
    units?: number;
    notes?: string;
  }) =>
    request<ObserveListingPayload>('/api/crm/observe-listing', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  // ===== Tracked products =====
  trackedProducts: () => request<ProductRow[]>('/api/products'),
  sodProducts: (tracked = true) =>
    request<SodProductsResponse>(`/api/sod/products${tracked ? '?tracked=1' : ''}`),

  // ===== System-of-action CRM (Sprint 3 backend) =====
  today: (rep: string, limit = 8) =>
    request<TodayPayload>(`/api/crm/today/${encodeURIComponent(rep)}?limit=${limit}`),
  reps: () => request<{ rep: string; store_count: number }[]>('/api/crm/reps-with-stores'),

  deals: (params: {
    rep?: string; stage?: string; sku?: string; store_number?: number; include_closed?: boolean;
  } = {}) => {
    const qs = new URLSearchParams();
    if (params.rep) qs.set('rep', params.rep);
    if (params.stage) qs.set('stage', params.stage);
    if (params.sku) qs.set('sku', params.sku);
    if (params.store_number) qs.set('store_number', String(params.store_number));
    if (params.include_closed) qs.set('include_closed', '1');
    const s = qs.toString();
    return request<DealsPayload>(`/api/crm/deals${s ? `?${s}` : ''}`);
  },
  createDeal: (body: DealCreate) =>
    request<{ status: string; id: number }>('/api/crm/deals', {
      method: 'POST', body: JSON.stringify(body),
    }),
  updateDeal: (id: number, body: Partial<Deal>) =>
    request<{ status: string }>(`/api/crm/deals/${id}`, {
      method: 'PATCH', body: JSON.stringify(body),
    }),
  deleteDeal: (id: number) =>
    request<{ status: string }>(`/api/crm/deals/${id}`, { method: 'DELETE' }),

  activities: (params: {
    rep?: string; store_number?: number; horeca_account_id?: number; days?: number;
  } = {}) => {
    const qs = new URLSearchParams();
    if (params.rep) qs.set('rep', params.rep);
    if (params.store_number) qs.set('store_number', String(params.store_number));
    if (params.horeca_account_id) qs.set('horeca_account_id', String(params.horeca_account_id));
    if (params.days != null) qs.set('days', String(params.days));
    const s = qs.toString();
    return request<{ activities: Activity[]; window_days: number; total: number }>(
      `/api/crm/activities${s ? `?${s}` : ''}`,
    );
  },
  logActivity: (body: ActivityCreate) =>
    request<{ status: string; id: number }>('/api/crm/activities', {
      method: 'POST', body: JSON.stringify(body),
    }),

  quotas: (params: { rep?: string; quarter?: string } = {}) => {
    const qs = new URLSearchParams();
    if (params.rep) qs.set('rep', params.rep);
    if (params.quarter) qs.set('quarter', params.quarter);
    const s = qs.toString();
    return request<QuotasPayload>(`/api/crm/quotas${s ? `?${s}` : ''}`);
  },
  upsertQuota: (body: QuotaCreate) =>
    request<{ status: string }>('/api/crm/quotas', {
      method: 'POST', body: JSON.stringify(body),
    }),

  velocity: (sku: string, days = 30, top = 20) =>
    request<VelocityPayload>(`/api/crm/velocity/${sku}?days=${days}&top=${top}`),
  shelfShare: (storeNumber: number | string) =>
    request<ShelfSharePayload>(`/api/crm/shelf-share/${storeNumber}`),

  // ===== Hero charts =====
  portfolioTrend: (days = 30) =>
    request<PortfolioTrendPayload>(`/api/crm/portfolio-trend?days=${days}`),
  ingestCalendar: (days = 14) =>
    request<IngestCalendarPayload>(`/api/sod/ingest-calendar?days=${days}`),

  // ===== Killer rep workflow: in-store replace targets =====
  storeFull: (storeNumber: number | string) =>
    request<StoreFullPayload>(`/api/crm/store/${storeNumber}/full`),
  storeSearch: (q: string) =>
    request<StoreSearchPayload>(`/api/crm/store-search?q=${encodeURIComponent(q)}`),
  // Update editable store fields (manager name, phone, email, rep, priority).
  // Reps fill these in during visits so the directory grows over time.
  updateStore: (storeId: number, fields: Partial<{
    account: string; address: string; city: string; postal: string;
    phone: string; email: string; rep: string; priority: string;
    manager_name: string; asst_manager_name: string;
    manager_phone: string; store_email: string; contacts: string; producer: string;
  }>) =>
    request<{ success: boolean }>(`/api/stores/${storeId}`, {
      method: 'PUT',
      body: JSON.stringify(fields),
    }),

  // Per-rep performance scoreboard
  repPerformance: (days = 30) =>
    request<RepPerformancePayload>(`/api/crm/rep-performance?days=${days}`),
  // Daily activity log (manager visibility)
  dailyLog: (params: { date?: string; days?: number } = {}) => {
    const qs = new URLSearchParams();
    if (params.date) qs.set('date', params.date);
    if (params.days != null) qs.set('days', String(params.days));
    const s = qs.toString();
    return request<DailyLogPayload>(`/api/crm/daily-log${s ? `?${s}` : ''}`);
  },
  // 14-day territory plan per rep (Namit/Surya)
  territoryPlan: (rep: string, days = 14, max_per_day = 9) =>
    request<TerritoryPlanPayload>(`/api/crm/territory-plan?rep=${encodeURIComponent(rep)}&days=${days}&max_per_day=${max_per_day}`),

  storesFinder: (params: { city?: string; rep?: string; territory_id?: number; priority?: string } = {}) => {
    const qs = new URLSearchParams();
    if (params.city) qs.set('city', params.city);
    if (params.rep) qs.set('rep', params.rep);
    if (params.territory_id != null) qs.set('territory_id', String(params.territory_id));
    if (params.priority) qs.set('priority', params.priority);
    const s = qs.toString();
    return request<StoresFinderPayload>(`/api/crm/stores-finder${s ? `?${s}` : ''}`);
  },

  // ===== Tasting bookings =====
  bookTasting: (body: {
    store_number: number;
    rep: string;
    scheduled_date: string;
    sku?: string;
    notes?: string;
    expected_units?: number;
  }) =>
    request<{ status: 'booked' | 'exists'; deal_id: number; scheduled_date: string; rep: string }>(
      '/api/crm/tasting-booking',
      { method: 'POST', body: JSON.stringify(body) },
    ),
  upcomingTastings: (params: { days?: number; rep?: string } = {}) => {
    const qs = new URLSearchParams();
    if (params.days != null) qs.set('days', String(params.days));
    if (params.rep) qs.set('rep', params.rep);
    const s = qs.toString();
    return request<UpcomingTastingsPayload>(
      `/api/crm/tastings/upcoming${s ? `?${s}` : ''}`,
    );
  },
  calendarIcsUrl: (rep: string, days = 60) =>
    `${API_BASE}/api/crm/calendar/${encodeURIComponent(rep)}.ics?days=${days}`,
  replaceTargets: (storeNumber: number | string, perCat = 5) =>
    request<ReplaceTargetsPayload>(`/api/crm/store/${storeNumber}/replace-targets?per_cat=${perCat}`),

  // ===== Sprint 4: Brand drill-down + distribution additions =====
  brands: () => request<BrandsPayload>('/api/crm/brands'),
  brand: (brand: string) =>
    request<BrandDetailPayload>(`/api/crm/brand/${encodeURIComponent(brand)}`),
  distributionAdditions: (params: { days?: number; sku?: string; brand?: string } = {}) => {
    const qs = new URLSearchParams();
    if (params.days != null) qs.set('days', String(params.days));
    if (params.sku) qs.set('sku', params.sku);
    if (params.brand) qs.set('brand', params.brand);
    const s = qs.toString();
    return request<DistributionAdditionsPayload>(
      `/api/crm/distribution-additions${s ? `?${s}` : ''}`,
    );
  },
  backfillStoreChanges: () =>
    request<{ inserted: number; status: string }>('/api/crm/backfill-store-changes', {
      method: 'POST',
    }),

  // ===== Manual listing entry + new-shipment detection =====
  logListing: (body: { sku: string; store_number: number; change_date?: string }) =>
    request<{ status: string; id: number | null; sku: string; brand: string; product_name: string; store_number: number; change_date: string }>(
      '/api/crm/log-listing',
      { method: 'POST', body: JSON.stringify(body) },
    ),
  inventoryAdds: (params: { days?: number; sku?: string } = {}) => {
    const qs = new URLSearchParams();
    if (params.days != null) qs.set('days', String(params.days));
    if (params.sku) qs.set('sku', params.sku);
    const s = qs.toString();
    return request<InventoryAddsPayload>(`/api/crm/inventory-adds${s ? `?${s}` : ''}`);
  },

  // ===== Dual-source reconciliation =====
  lcboLiveDiscoveries: (days = 30) =>
    request<LcboLiveDiscoveriesPayload>(`/api/crm/lcbo-live-discoveries?days=${days}`),
  lcboRescan: () =>
    request<{ status: string; note: string }>('/api/crm/lcbo-rescan', { method: 'POST' }),

  // ===== Storage backbone =====
  tastingFollowups: (days = 365) =>
    request<TastingFollowupsPayload>(`/api/crm/tasting-followups?days=${days}`),
  eventLog: (params: { days?: number; entity_type?: string; actor?: string } = {}) => {
    const qs = new URLSearchParams();
    if (params.days != null) qs.set('days', String(params.days));
    if (params.entity_type) qs.set('entity_type', params.entity_type);
    if (params.actor) qs.set('actor', params.actor);
    const s = qs.toString();
    return request<EventLogPayload>(`/api/crm/event-log${s ? `?${s}` : ''}`);
  },

  // ===== Manager dashboard =====
  managerDashboard: (params: { days_activity?: number; days_listings?: number } = {}) => {
    const qs = new URLSearchParams();
    if (params.days_activity != null) qs.set('days_activity', String(params.days_activity));
    if (params.days_listings != null) qs.set('days_listings', String(params.days_listings));
    const s = qs.toString();
    return request<ManagerDashboardPayload>(`/api/crm/manager-dashboard${s ? `?${s}` : ''}`);
  },
  assignStoresToTerritory: (territoryId: number, body: { store_numbers: number[]; rep_name?: string }) =>
    request<{ status: string; assigned: number; territory_id: number; rep: string | null }>(
      `/api/crm/territories/${territoryId}/assign-stores`,
      { method: 'POST', body: JSON.stringify(body) },
    ),

  // ===== NB Distillers premium tracker =====
  nbTracker: () => request<NbTrackerPayload>('/api/crm/nb-tracker'),
  anuImport: () => request<NbTrackerPayload>('/api/crm/anu-import'),

  // ===== Route planner =====
  cities: () => request<{ city: string; store_count: number }[]>('/api/crm/cities'),
  routePlanner: (params: {
    city?: string;
    district?: string;
    max_skus_listed?: number;
    brand?: string;
    max_stops?: number;
    start_lat?: number;
    start_lng?: number;
  }) => {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v != null && v !== '') qs.set(k, String(v));
    });
    return request<RoutePlannerPayload>(`/api/crm/route-planner?${qs.toString()}`);
  },

  // ===== Admin: rep roster =====
  roster: () => request<{ roster: string[]; placeholder_for_unassigned: string }>('/api/crm/admin/roster'),
  setRoster: (body: { roster?: string[]; placeholder?: string } = {}) =>
    request<{
      status: string;
      roster: string[];
      cleared_stores_count: number;
      territories_reset_to_placeholder: number;
      placeholder: string;
    }>('/api/crm/admin/set-roster', { method: 'POST', body: JSON.stringify(body) }),
  bulkReassignRep: (body: { from_rep: string; to_rep: string }) =>
    request<{ status: string; reassigned: number; to_rep: string }>(
      '/api/crm/admin/bulk-reassign-rep',
      { method: 'POST', body: JSON.stringify(body) },
    ),
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

// Sprint 2 types
export interface SkuTrend {
  sku: string;
  brand: string;
  product_name: string;
  days: number;
  since: string;
  series: Array<{
    date: string;
    listed: number;
    delisting: number;
    fully_delisted: number;
    total_on_hand: number;
    avg_on_hand: number;
  }>;
  freshness: Freshness;
}

export interface StoreTrend {
  store_number: number;
  days: number;
  since: string;
  series: Array<{
    date: string;
    sku: string;
    brand: string;
    product_name: string;
    status: string;
    on_hand: number;
  }>;
  freshness: Freshness;
}

export interface Delta {
  abs: number;
  pct: number | null;
}

export interface WowDeltasPayload {
  snapshots: Record<string, string | null>;
  tracked: Array<{
    sku: string;
    brand: string;
    product_name: string;
    now: { listed: number; on_hand: number };
    wow: { listed_delta: Delta; on_hand_delta: Delta; baseline_snapshot: string | null };
    mom: { listed_delta: Delta; on_hand_delta: Delta; baseline_snapshot: string | null };
    yoy: { listed_delta: Delta; on_hand_delta: Delta; baseline_snapshot: string | null };
  }>;
  freshness: Freshness;
}

export interface NearbyStore extends Store {
  distance_km: number;
  sku_status?: string | null;
  sku_on_hand?: number;
  opportunity_score?: number;
}
export interface NearbyPayload {
  origin: { lat: number; lng: number };
  radius_km: number;
  sku: string | null;
  results: NearbyStore[];
  total_within_radius: number;
}

export interface StoreUniversePayload {
  as_of: string;
  lcbo_window_hours: number;
  universe_stats: {
    total_universe_size: number;
    in_all_three: number;
    in_master_only: number;
    in_sod_only: number;
    in_lcbo_only: number;
    in_master_and_sod: number;
    in_master_and_lcbo: number;
    in_sod_and_lcbo: number;
  };
  carrying_stats: {
    total_stores_carrying_any_sku: number;
    sod_only: number;
    lcbo_only: number;
    rep_only: number;
    sod_and_lcbo: number;
    all_three: number;
  };
  drift: {
    sod_only_stores: number[];
    lcbo_only_stores: number[];
    master_only_stores: number[];
    carrying_us_only_in_sod: number[];
    carrying_us_only_in_lcbo: number[];
    carrying_us_only_via_rep: number[];
  };
  how_to_read: string;
  per_store?: Record<
    string,
    {
      in_master: boolean;
      in_sod_latest: boolean;
      in_lcbo_recent: boolean;
      carrying_skus: string[];
      carrying_sources: string[];
    }
  >;
}

export interface MovementPayload {
  window: { start: string; end: string; days: number };
  sku_filter: string | null;
  tracked_only: boolean;
  store_universe: {
    snapshot_date: string | null;
    /** Authoritative LCBO universe — from our master `stores` directory. */
    lcbo_universe_total: number;
    /** Stores that carry at least one of our 8 tracked SKUs in the latest SOD snapshot. */
    stores_carrying_our_skus: number;
    /** Stores in our directory that don't currently carry any of our SKUs (= listing opportunities). */
    stores_without_our_skus: number;
    /** Stores in latest SOD snapshot that aren't in our master directory (= un-onboarded). */
    stores_in_sod_not_in_crm: number;
    /** Pct of LCBO universe that carries at least one of our SKUs. */
    carrying_pct: number;
    /** UNION across master + SOD + lcbo.com — the authoritative count. */
    union_total_stores?: number;
    /** Stores carrying any of our SKUs across ANY source (the truth, ignoring single-source gaps). */
    carrying_us_anywhere?: number;
    /** Carrying-us only in SOD (lcbo.com hasn't confirmed). */
    carrying_only_sod?: number;
    /** Carrying-us only on lcbo.com (SOD missed → potential commission claim). */
    carrying_only_lcbo?: number;
    /** Carrying-us only flagged by a rep on shelf (manual override). */
    carrying_only_rep_observed?: number;
    /** Carrying-us confirmed by both SOD and lcbo.com. */
    carrying_in_sod_and_lcbo?: number;
    /** Per-source drift breakdown. */
    source_drift?: {
      in_sod_not_master: number;
      in_lcbo_not_master: number;
      in_master_not_either: number;
    };
    // Legacy aliases — present for backward compat, prefer the typed names above.
    current_lcbo_stores?: number;
    crm_stores?: number;
    crm_minus_lcbo?: number;
    lcbo_minus_crm?: number;
    error?: string;
  };
  new_stores: {
    added_in_range: number;
    store_list: Array<{ store_number: number; first_seen_date: string }>;
    error?: string;
  };
  listings: {
    new_in_range: number;
    delisted_in_range: number;
    relisted_in_range: number;
    per_sku: Array<{ sku: string; product_name: string; brand: string; new_listings: number }>;
    per_day: Array<{ date: string; NEW_LISTING: number; DELISTED: number; RELISTED: number }>;
    sample_new_listings: Array<{
      date: string;
      sku: string;
      product_name: string;
      brand: string;
      store_number: number | null;
    }>;
    error?: string;
  };
  as_of: string;
}

export type CommissionVerdict = 'lcbo_only' | 'sod_only_empty' | 'sod_only_stale' | 'agree';

export interface CommissionAuditRow {
  sku: string;
  product_name: string;
  brand: string;
  store_number: number;
  verdict: CommissionVerdict;
  claim_units: number;
  sod_status: string | null;
  sod_on_hand: number;
  sod_snapshot_date: string | null;
  lcbo_units: number;
  lcbo_seen_at: string | null;
  rep_observed: boolean;
  rep_observation_at: string | null;
  rep_observation_by: string | null;
}

export interface CommissionAuditPayload {
  as_of: string;
  window_days: number;
  sku_filter: string | null;
  summary: {
    lcbo_only: number;
    sod_only_empty: number;
    sod_only_stale: number;
    agree: number;
    units_undercounted: number;
  };
  rows: CommissionAuditRow[];
  how_to_use: string;
}

export interface ObserveListingPayload {
  id: number;
  sku: string;
  store_number: number;
  rep: string;
  on_shelf: boolean;
  recorded_at: string;
  note: string;
}

export interface AiAskPayload {
  question: string;
  sql: string;
  rows: Array<Record<string, unknown>>;
  columns: string[];
  row_count: number;
  answer: string;
  model: string;
}

// ===== Sprint 3: workflow types =====
export interface TodayStop {
  store_id: number;
  store_number: number;
  account: string;
  address: string;
  city: string;
  postal: string;
  priority: string;
  lat: number;
  lng: number;
  territory_id: number | null;
  territory_name: string;
  territory_color: string;
  days_since_visit: number | null;
  visit_count: number;
  oos_count: number;
  deals: Array<{ sku: string; stage: string; next_action: string; next_action_date: string | null }>;
  score: number;
}

export interface TodayPayload {
  rep: string;
  plan_date: string;
  stops: TodayStop[];
  total_distance_km: number;
  total_stops: number;
  overdue_deal_actions: number;
  total_candidate_stores: number;
}

export type DealStage =
  | 'prospecting'
  | 'pitched'
  | 'tasting_scheduled'
  | 'tasting_done'
  | 'samples_left'
  | 'in_review'
  | 'listed'
  | 'lost';

export interface Deal {
  id: number;
  store_number: number | null;
  horeca_account_id: number | null;
  sku: string;
  brand: string;
  product_name: string;
  stage: DealStage;
  probability: number;
  expected_close_date: string | null;
  expected_units: number;
  expected_revenue: number;
  owner_rep: string;
  next_action: string;
  next_action_date: string | null;
  notes: string;
  source: string;
  closed_at: string | null;
  closed_reason: string;
  created_at: string | null;
  updated_at: string | null;
  account: string;
  city: string;
  territory_id: number | null;
  territory_name: string;
  territory_color: string;
  horeca_name: string | null;
}

export interface DealCreate {
  store_number?: number;
  horeca_account_id?: number;
  sku: string;
  stage?: DealStage;
  probability?: number;
  expected_close_date?: string;
  expected_units?: number;
  expected_revenue?: number;
  owner_rep?: string;
  next_action?: string;
  next_action_date?: string;
  notes?: string;
  source?: string;
}

export interface DealsPayload {
  deals: Deal[];
  stage_counts: Record<string, number>;
  stages: Array<{ key: DealStage; label: string; probability: number }>;
}

export interface Activity {
  id: number;
  created_at: string | null;
  activity_type: string;
  rep: string;
  outcome: string;
  notes: string;
  rating: number;
  duration_minutes: number;
  next_action: string;
  next_action_date: string | null;
  store_id: number | null;
  store_number: number | null;
  account: string | null;
  city: string | null;
  horeca_account_id: number | null;
  horeca_name: string | null;
}

export interface ActivityCreate {
  rep: string;
  activity_type: string;
  store_number?: number;
  store_id?: number;
  horeca_account_id?: number;
  outcome?: string;
  notes?: string;
  rating?: number;
  duration_minutes?: number;
  next_action?: string;
  next_action_date?: string;
  /** When the activity ACTUALLY happened (allows backdating). Defaults to today. */
  visit_date?: string;
  lat?: number;
  lng?: number;
  sku_outcomes?: Array<{ sku: string; outcome: string; facings?: number; competitor_notes?: string }>;
  advance_pipeline_stage?: DealStage;
}

export interface QuotaTargets {
  activities: number;
  visits: number;
  new_listings: number;
  units: number;
  revenue: number;
}
export interface QuotaAchieved {
  activities: number;
  visits: number;
  new_listings: number;
  units: number;
  revenue: number;
}
export interface Quota {
  id: number;
  rep: string;
  quarter: string;
  period_start: string;
  period_end: string;
  targets: QuotaTargets;
  achieved: QuotaAchieved;
  pct: { activities: number | null; visits: number | null; new_listings: number | null };
  notes: string;
}
export interface QuotasPayload {
  quarter: string;
  quotas: Quota[];
}
export interface QuotaCreate {
  rep: string;
  quarter?: string;
  target_activities?: number;
  target_visits?: number;
  target_new_listings?: number;
  target_units?: number;
  target_revenue?: number;
  notes?: string;
}

export interface VelocityStore {
  store_number: number;
  week_velocity: number | null;
  days_to_oos: number | null;
  current_on_hand: number;
  prior_on_hand: number;
  prior_date: string | null;
}
export interface VelocityPayload {
  sku: string;
  brand: string;
  product_name: string;
  window_days: number;
  overall: VelocityStore;
  per_store_top: VelocityStore[];
  freshness: Freshness;
}

export interface ShelfShareCategory {
  category: string;
  our_facings: number;
  total_facings: number;
  our_on_hand: number;
  total_on_hand: number;
  share_by_facings_pct: number;
  share_by_on_hand_pct: number;
}
export interface ShelfSharePayload {
  store_number: number;
  snapshot_date: string | null;
  categories: ShelfShareCategory[];
}

export interface PortfolioTrendPayload {
  days: number;
  since: string;
  series: Array<{
    date: string;
    listed: number;
    delisting: number;
    fully_delisted: number;
    total_on_hand: number;
    skus_with_data: number;
  }>;
  freshness: Freshness;
}

export interface IngestCalendarDay {
  date: string;
  weekday: string;
  has_snapshot: boolean;
  latest_run_at: string | null;
  success_runs: number;
  failed_runs: number;
  sources: string;
  is_today: boolean;
}
export interface IngestCalendarPayload {
  days: number;
  calendar: IngestCalendarDay[];
}

export interface StoreFullPayload {
  store: {
    id: number;
    store_number: number;
    account: string;
    address: string;
    city: string;
    postal: string;
    phone: string;
    email: string;
    priority: string;
    rep: string;
    lat: number;
    lng: number;
    manager_name: string;
    asst_manager_name: string;
    manager_phone: string;
    store_email: string;
    territory_id: number | null;
    territory_code: string;
    territory_name: string;
    territory_color: string;
  };
  snapshot_date: string | null;
}

export interface StoreSearchMatch {
  id: number;
  store_number: number;
  account: string;
  address: string;
  city: string;
  postal: string;
  phone: string;
  manager_phone: string;
  manager_name: string;
  rep: string;
  lat: number;
  lng: number;
  last_activity_at?: string | null;
  last_activity_type?: string | null;
  last_activity_rep?: string;
  last_activity_notes?: string;
}
export interface StoreSearchPayload {
  matches: StoreSearchMatch[];
  query: string;
}

export interface FinderStore {
  id: number;
  store_number: number;
  account: string;
  address: string;
  city: string;
  postal: string;
  phone: string;
  manager_phone: string;
  manager_name: string;
  asst_manager_name: string;
  store_email: string;
  rep: string;
  priority: string;
  territory_id: number | null;
  territory_name: string;
  territory_color: string;
  lat: number;
  lng: number;
  last_activity_at: string | null;
  last_activity_type: string | null;
  last_activity_rep: string;
  last_activity_notes: string;
  total_activities: number;
  total_deals: number;
  open_deals: number;
}
export interface StoresFinderPayload {
  count: number;
  stores: FinderStore[];
  filters: { city: string | null; rep: string | null; territory_id: number | null; priority: string | null };
  freshness: Freshness;
}

export interface RepPerformanceRow {
  rep: string;
  activities_total: number;
  activities_by_type: Record<string, number>;
  stores_covered: number;
  days_active: number;
  deals_open: number;
  deals_listed: number;
  deals_lost: number;
  listings_won_in_window: number;
  last_activity_at: string | null;
  last_activity_store: number | null;
  last_activity_type: string | null;
  tasting_to_listing_rate_pct: number | null;
}
export interface RepPerformancePayload {
  window_days: number;
  since: string;
  reps: RepPerformanceRow[];
  totals: {
    activities: number;
    stores_covered: number;
    listings_won: number;
    open_deals: number;
  };
}

export interface DailyLogActivity {
  id: number;
  created_at: string | null;
  visit_date: string | null;
  rep: string;
  activity_type: string;
  notes: string;
  outcome: string;
  duration_minutes: number;
  rating: number;
  store_number: number | null;
  account: string;
  city: string;
  address: string;
  territory_name: string;
  territory_color: string;
}
export interface DailyLogPayload {
  window: { start: string; end: string; days: number };
  count: number;
  activities: DailyLogActivity[];
  by_rep: Array<{ rep: string; count: number; by_type: Record<string, number>; stores_visited: number }>;
}

export interface TerritoryPlanStore {
  id: number;
  store_number: number;
  account: string;
  address: string;
  city: string;
  postal: string;
  priority: string;
  lat: number;
  lng: number;
  manager_name: string;
  phone: string;
  rep_assigned: string;
  territory_name: string;
  territory_color: string;
  last_visit_at: string | null;
  leg_km?: number | null;
}
export interface TerritoryPlanDay {
  day: number;
  date: string;
  stops: number;
  total_km_est: number;
  cluster_label: string;
  stores: TerritoryPlanStore[];
}
export interface TerritoryPlanPayload {
  rep: string;
  territory_name: string;
  days_in_plan: number;
  total_stores_in_territory: number;
  stores_in_plan: number;
  max_per_day: number;
  plan: TerritoryPlanDay[];
}

export interface TastingBooking {
  deal_id: number;
  store_number: number;
  sku: string;
  scheduled_date: string;
  expected_units: number;
  rep: string;
  notes: string;
  booked_at: string | null;
  account: string;
  address: string;
  city: string;
  postal: string;
  manager_name: string;
  phone: string;
  territory_name: string;
  territory_color: string;
}
export interface UpcomingTastingsPayload {
  window: { from: string; to: string; days: number };
  rep: string;
  count: number;
  bookings: TastingBooking[];
}

export interface ReplaceTarget {
  competitor_sku: string;
  competitor_name: string;
  competitor_brand: string;
  competitor_status: string;
  competitor_on_hand: number;
  opportunity_score: number;
}
export interface ReplaceCategory {
  category: string;
  pitch_our_sku: string;
  pitch_our_brand: string;
  pitch_our_product: string;
  targets: ReplaceTarget[];
}
export interface ReplaceTargetsPayload {
  store_number: number;
  snapshot_date: string | null;
  categories: ReplaceCategory[];
}

// Sprint 4 types
export interface BrandSummary {
  brand: string;
  slug: string;
  sku_count: number;
  skus: Array<{ sku: string; product_name: string }>;
  total_listed: number;
  total_delisting: number;
  total_on_hand: number;
  total_stores: number;
  additions_60d: number;
}
export interface BrandsPayload {
  brands: BrandSummary[];
}

export interface BrandDetailPayload {
  brand: string;
  skus: string[];
  per_sku: Array<{
    sku: string;
    brand: string;
    product_name: string;
    snapshot_date: string | null;
    listed: number;
    delisting: number;
    fully_delisted: number;
    total_on_hand: number;
  }>;
  totals: {
    total_stores_with_any_listed: number;
    total_stores_with_all_listed: number;
    total_stores_with_any_delisting: number;
    total_stores_in_matrix: number;
  };
  matrix: Array<{
    store_number: number;
    account: string | null;
    city: string | null;
    territory_name: string | null;
    territory_color: string | null;
    skus: Record<string, { status: string; on_hand: number }>;
  }>;
  recent_changes_60d: {
    counts: Record<string, number>;
    recent: Array<{
      sku: string;
      store_number: number;
      change_date: string;
      change_type: string;
      old_status: string | null;
      new_status: string | null;
      account: string | null;
      city: string | null;
    }>;
  };
  freshness: Freshness;
}

export interface DistributionAddition {
  sku: string;
  brand: string;
  product_name: string;
  store_number: number;
  change_date: string;
  old_status: string | null;
  new_status: string | null;
  change_type: string;
  account: string | null;
  city: string | null;
  postal: string | null;
  rep: string | null;
  priority: string | null;
  territory_name: string;
  territory_color: string;
  current_on_hand: number;
  current_status: string | null;
}
export interface DistributionAdditionsPayload {
  days_requested: number;
  days_of_history_available: number;
  earliest_snapshot: string | null;
  latest_snapshot: string | null;
  // legacy alias for backward compat in case old fields are referenced
  days?: number;
  since: string;
  total: number;
  per_sku: Array<{
    sku: string;
    brand: string;
    product_name: string;
    count: number;
    still_listed: number;
    lost_again: number;
  }>;
  additions: DistributionAddition[];
  freshness: Freshness;
}

export interface InventoryAddEvent {
  sku: string;
  brand: string;
  product_name: string;
  store_number: number;
  snapshot_date: string;
  on_hand: number;
  prev_on_hand: number;
  prev_date: string | null;
  jump: number;
  account: string | null;
  city: string | null;
  postal: string | null;
  rep: string | null;
  territory_name: string;
  territory_color: string;
}
export interface InventoryAddsPayload {
  days_requested: number;
  days_of_history_available: number;
  earliest_snapshot: string | null;
  latest_snapshot: string | null;
  since: string;
  total: number;
  per_sku: Array<{
    sku: string;
    brand: string;
    product_name: string;
    event_count: number;
    unique_stores: number;
    total_units_added: number;
  }>;
  events: InventoryAddEvent[];
  freshness: Freshness;
}

export interface LcboLiveDiscovery {
  sku: string;
  brand: string;
  product_name: string;
  store_number: number;
  change_date: string;
  old_sod_status: string | null;
  account: string | null;
  city: string | null;
  postal: string | null;
  rep: string | null;
  territory_name: string;
  territory_color: string;
  current_sod_status: string | null;
  current_sod_on_hand: number;
  last_lcbo_seen: string | null;
}
export interface LcboLiveDiscoveriesPayload {
  days: number;
  since: string;
  total: number;
  discoveries: LcboLiveDiscovery[];
  freshness: Freshness;
}

export interface TastingFollowup {
  sku: string;
  brand: string;
  product_name: string;
  store_number: number;
  store_id: number | null;
  account: string | null;
  city: string | null;
  postal: string | null;
  territory_name: string;
  territory_color: string;
  tasting_date: string;
  days_since_tasting: number | null;
  tasting_outcome: string;
  tasting_facings: number;
  activity_id: number;
  activity_type: string;
  activity_outcome: string;
  activity_notes: string;
  rep: string;
  current_sod_status: string | null;
  current_sod_on_hand: number;
  priority_score: number;
}
export interface TastingFollowupsPayload {
  days: number;
  since: string;
  total: number;
  followups: TastingFollowup[];
}

export interface EventLogEntry {
  id: number;
  event_type: string;
  entity_type: string;
  entity_id: string | null;
  actor: string;
  payload_json: string;
  ip_address: string;
  user_agent: string;
  created_at: string;
}
export interface EventLogPayload {
  events: EventLogEntry[];
  days: number;
  total: number;
}

export interface ManagerRepRow {
  rep: string;
  store_count: number;
  gap_count: number;
  activities_30d: number;
  visits_30d: number;
  tastings_30d: number;
  outreach_30d: number;
  listings_won_60d: number;
  new_stores_60d: number;
  delistings_60d: number;
  quota_activities: number;
  quota_visits: number;
  quota_new_listings: number;
  pct_quota_activities: number | null;
  pct_quota_visits: number | null;
  pct_quota_listings: number | null;
  gap_pct: number | null;
}
export interface ManagerTerritoryRow {
  id: number;
  code: string;
  name: string;
  region: string;
  color: string;
  rep_name: string;
  store_count: number;
}
export interface RouteStop {
  store_id: number;
  store_number: number;
  account: string;
  address: string;
  city: string;
  postal: string;
  priority: string;
  rep: string;
  lat: number;
  lng: number;
  manager_name: string;
  manager_phone: string;
  territory_id: number | null;
  territory_name: string;
  territory_color: string;
  skus_listed: number;
  leg_distance_km: number;
}
export interface RoutePlannerPayload {
  city: string | null;
  district: string | null;
  brand_filter: string;
  max_skus_listed: number;
  total_stops: number;
  total_distance_km: number;
  total_candidates: number;
  route: RouteStop[];
  freshness?: Freshness;
}

export interface NbTrackerPayload {
  brand: string;
  tagline: string;
  skus: string[];
  per_sku: Array<{
    sku: string;
    brand: string;
    product_name: string;
    lcbo_url: string;
    snapshot_date: string | null;
    listed: number;
    delisting: number;
    fully_delisted: number;
    total_on_hand: number;
    avg_on_hand_at_listed: number;
  }>;
  totals: {
    total_skus: number;
    total_listed_stores: number;
    total_delisting_stores: number;
    total_on_hand_units: number;
    additions_60d: number;
    delistings_60d: number;
    oos_risk_count: number;
    tasting_followups_count: number;
  };
  top_stores: Array<{
    store_number: number;
    sku: string;
    product_name: string;
    status: string;
    on_hand: number;
    account: string | null;
    city: string | null;
    territory_name: string;
    territory_color: string;
  }>;
  additions_60d: Array<{
    sku: string;
    product_name: string;
    store_number: number;
    change_date: string;
    change_type: string;
    account: string | null;
    city: string | null;
    territory_name: string;
    territory_color: string;
    current_on_hand: number;
    current_status: string | null;
  }>;
  delistings_60d: Array<{
    sku: string;
    product_name: string;
    store_number: number;
    change_date: string;
    change_type: string;
    old_status: string | null;
    new_status: string | null;
    account: string | null;
    city: string | null;
    territory_name: string;
    territory_color: string;
  }>;
  oos_risk: Array<{
    sku: string;
    product_name: string;
    store_number: number;
    on_hand: number;
    severity: string;
    account: string | null;
    city: string | null;
    territory_name: string;
    territory_color: string;
  }>;
  tasting_followups: Array<{
    sku: string;
    product_name: string;
    store_number: number;
    tasting_date: string;
    days_since_tasting: number | null;
    tasting_outcome: string;
    rep: string;
    account: string | null;
    city: string | null;
    territory_name: string;
    territory_color: string;
    current_sod_status: string | null;
  }>;
  territory_coverage: Array<{
    code: string;
    name: string;
    color: string;
    nb_stores: number;
    total_stores: number;
    coverage_pct: number;
  }>;
  trend_30d: Array<{
    date: string;
    listed: number;
    delisting: number;
    total_on_hand: number;
  }>;
  freshness: Freshness;
}

export interface ManagerDashboardPayload {
  days_activity: number;
  days_listings: number;
  reps: ManagerRepRow[];
  territories: ManagerTerritoryRow[];
  totals: {
    reps: number;
    territories: number;
    total_stores: number;
    total_listings_won_60d: number;
    total_new_stores_60d: number;
    total_delistings_60d: number;
    total_activities_30d: number;
    total_gap: number;
  };
  freshness: Freshness;
}
