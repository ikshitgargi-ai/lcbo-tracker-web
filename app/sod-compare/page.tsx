'use client';

import { useState, useRef } from 'react';
import { useMutation } from '@tanstack/react-query';
import Link from 'next/link';
import { GitCompare, Upload, FileArchive, AlertTriangle, RefreshCw, Database } from 'lucide-react';
import { toast } from 'sonner';
import { api, type SodCompareUploadsPayload } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatNumber } from '@/lib/utils';
import { PasscodeGate } from '@/components/passcode-gate';

/**
 * SOD Compare — operator uploads a historical SOD inventory ZIP from
 * sod.lcbo.com and (optionally) a second ZIP, the backend diffs them
 * and returns per-SKU stores added / lost. Bypasses the "we don't have
 * historical SOD data in the DB" problem because the operator BRINGS
 * the historical data with them.
 *
 * Passcode-gated (operator-only) — same passcode as Commission Audit.
 */
export default function SodComparePage() {
  return (
    <PasscodeGate
      storageKey="commission_audit_unlocked"
      passcode="0257"
      title="SOD Inventory Compare"
      description="Operator-only view. Same passcode as Commission Audit."
    >
      <SodCompareInner />
    </PasscodeGate>
  );
}

function SodCompareInner() {
  const [fromFile, setFromFile] = useState<File | null>(null);
  const [toFile, setToFile] = useState<File | null>(null);
  const [includeLcbo, setIncludeLcbo] = useState(true);
  const [skuFilter, setSkuFilter] = useState('');
  const [result, setResult] = useState<SodCompareUploadsPayload | null>(null);
  const [expandedSku, setExpandedSku] = useState<string | null>(null);

  const fromRef = useRef<HTMLInputElement>(null);
  const toRef = useRef<HTMLInputElement>(null);

  const compare = useMutation({
    mutationFn: () => {
      const fd = new FormData();
      if (!fromFile) throw new Error('Please pick a from-zip');
      fd.append('from_zip', fromFile);
      if (toFile) fd.append('to_zip', toFile);
      if (skuFilter) fd.append('sku', skuFilter);
      fd.append('include_lcbo', includeLcbo ? '1' : '0');
      return api.sodCompareUploads(fd);
    },
    onSuccess: (r) => {
      setResult(r);
      toast.success(`Compared ${r.from_filename || 'file'} vs ${r.to_filename || 'DB latest'}`);
    },
    onError: (e: unknown) => {
      toast.error((e as Error).message || 'Compare failed');
    },
  });

  const upload = useMutation({
    mutationFn: () => {
      const fd = new FormData();
      if (!fromFile) throw new Error('Please pick a zip first');
      fd.append('zip', fromFile);
      return api.sodUploadHistorical(fd);
    },
    onSuccess: (r) => {
      toast.success(
        `Backfilled ${formatNumber(r.inserted)} rows for dates ${r.dates_in_zip.join(', ')}`,
        { duration: 8000 },
      );
    },
    onError: (e: unknown) => {
      toast.error((e as Error).message || 'Upload failed');
    },
  });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl sm:text-3xl font-semibold flex items-center gap-2">
          <GitCompare size={24} className="text-[var(--color-accent)]" />
          SOD Inventory Compare
        </h1>
        <p className="text-sm text-[var(--color-muted)]">
          Download a SOD inventory ZIP from <code>sod.lcbo.com</code> for a
          historical date, upload it here, and get a per-SKU diff against
          today&apos;s data. The right way to compute &quot;new stores added
          since March&quot; or any custom date range.
        </p>
      </header>

      {/* How-to */}
      <div className="m-card flex items-start gap-3 border-[rgba(212,165,116,0.3)] bg-[rgba(212,165,116,0.06)]">
        <AlertTriangle size={18} className="text-[var(--color-accent)] shrink-0 mt-0.5" />
        <div className="text-xs text-muted">
          <strong>How to use this page:</strong>
          <ol className="list-decimal ml-4 mt-1 space-y-0.5">
            <li>Log in to <code>sod.lcbo.com</code></li>
            <li>Download the inventory ZIP for the historical date you want as your baseline (e.g. <code>alldlyinventoryMON.zip</code> archived for March 1)</li>
            <li>
              Pick that ZIP as <em>From snapshot</em> below. Optionally pick a second ZIP as <em>To snapshot</em>; if omitted, we use the latest snapshot in our DB.
            </li>
            <li>Click <strong>Compare</strong>. The diff shows up below — per-SKU added / lost stores with clickable store-numbers.</li>
            <li>Or click <strong>Backfill into DB</strong> to ingest the historical ZIP so the regular <Link href="/new-listings" className="text-[var(--color-accent)] underline">/new-listings</Link> page can diff against any date that includes it.</li>
          </ol>
        </div>
      </div>

      {/* Uploaders */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Upload SOD ZIPs</CardTitle>
          <CardDescription>
            Files are stream-parsed in memory. Nothing gets saved unless you
            click &quot;Backfill into DB&quot;.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <FileSlot
            label="From snapshot (REQUIRED) — the historical baseline"
            file={fromFile}
            onChange={setFromFile}
            inputRef={fromRef}
          />
          <FileSlot
            label="To snapshot (optional) — defaults to latest in DB if omitted"
            file={toFile}
            onChange={setToFile}
            inputRef={toRef}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="SKU filter (optional)">
              <input
                type="text"
                placeholder="e.g. 0020187 (Red Admiral). Blank = all 8 tracked SKUs"
                value={skuFilter}
                onChange={(e) => setSkuFilter(e.target.value.replace(/[^0-9]/g, '').slice(0, 7))}
                className="select"
              />
            </Field>
            <Field label="Cross-check">
              <label className="flex items-center gap-2 text-sm pt-2">
                <input
                  type="checkbox"
                  checked={includeLcbo}
                  onChange={(e) => setIncludeLcbo(e.target.checked)}
                />
                Include lcbo.com cross-check (catches lcbo-only adds)
              </label>
            </Field>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => compare.mutate()}
              disabled={!fromFile || compare.isPending}
            >
              {compare.isPending ? (
                <RefreshCw size={14} className="animate-spin" />
              ) : (
                <GitCompare size={14} />
              )}
              {compare.isPending ? 'Comparing…' : 'Compare'}
            </Button>
            <Button
              variant="secondary"
              onClick={() => upload.mutate()}
              disabled={!fromFile || upload.isPending}
              title="Ingest this ZIP into the DB so /new-listings can diff against it later"
            >
              {upload.isPending ? (
                <RefreshCw size={14} className="animate-spin" />
              ) : (
                <Database size={14} />
              )}
              {upload.isPending ? 'Backfilling…' : 'Backfill into DB'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Result */}
      {result && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <StatCard
              label="Total stores added"
              value={formatNumber(result.summary.total_added)}
              highlight="success"
              help="Union: SOD-detected + lcbo.com-only"
            />
            <StatCard
              label="Total stores lost"
              value={formatNumber(result.summary.total_lost)}
              highlight={result.summary.total_lost > 0 ? 'warning' : undefined}
            />
            <StatCard
              label="lcbo-only adds"
              value={formatNumber(result.summary.total_lcbo_only)}
              highlight={result.summary.total_lcbo_only > 0 ? 'danger' : undefined}
              help="lcbo.com saw stock, SOD didn't list — potential commission claim"
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Per-SKU diff (from {result.from_filename || '?'} →{' '}
                {result.to_source === 'uploaded' ? result.to_filename : 'DB latest'})
              </CardTitle>
              <CardDescription>
                From dates: {result.from_dates_in_zip.join(', ') || '—'}.
                To dates: {result.to_dates.join(', ') || '—'}.
              </CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="data-table min-w-full text-xs">
                <thead>
                  <tr>
                    <th></th>
                    <th>SKU</th>
                    <th>Product</th>
                    <th>From listed</th>
                    <th>To listed</th>
                    <th>SOD added</th>
                    <th>lcbo-only added</th>
                    <th>Total added</th>
                    <th>Lost</th>
                    <th>Net</th>
                  </tr>
                </thead>
                <tbody>
                  {result.per_sku.map((r) => {
                    const open = expandedSku === r.sku;
                    return (
                      <>
                        <tr
                          key={r.sku}
                          onClick={() => setExpandedSku(open ? null : r.sku)}
                          className="cursor-pointer hover:bg-[rgba(255,255,255,0.03)]"
                        >
                          <td className="w-6">{open ? '▾' : '▸'}</td>
                          <td className="font-mono">{r.sku}</td>
                          <td>
                            <span className="text-muted">{r.brand}</span> {r.product_name}
                          </td>
                          <td className="tabular-nums">{r.from_listed_count}</td>
                          <td className="tabular-nums">{r.to_listed_count}</td>
                          <td className="tabular-nums">{r.sod_added_count}</td>
                          <td
                            className="tabular-nums font-semibold"
                            style={{ color: r.lcbo_only_added_count > 0 ? 'var(--color-danger)' : undefined }}
                          >
                            {r.lcbo_only_added_count}
                          </td>
                          <td
                            className="tabular-nums font-semibold"
                            style={{ color: r.union_added_count > 0 ? 'var(--color-success)' : undefined }}
                          >
                            {r.union_added_count}
                          </td>
                          <td
                            className="tabular-nums"
                            style={{ color: r.sod_lost_count > 0 ? 'var(--color-warning)' : undefined }}
                          >
                            {r.sod_lost_count}
                          </td>
                          <td
                            className="tabular-nums font-bold"
                            style={{
                              color:
                                r.net_change > 0
                                  ? 'var(--color-success)'
                                  : r.net_change < 0
                                    ? 'var(--color-danger)'
                                    : undefined,
                            }}
                          >
                            {r.net_change > 0 ? `+${r.net_change}` : r.net_change}
                          </td>
                        </tr>
                        {open && (
                          <tr key={`${r.sku}-d`} className="bg-[rgba(0,0,0,0.15)]">
                            <td colSpan={10} className="p-3 space-y-2">
                              {r.added_stores.length > 0 ? (
                                <>
                                  <div className="text-[10px] uppercase tracking-wider text-muted font-semibold">
                                    Stores added ({r.added_stores.length})
                                  </div>
                                  <div className="flex flex-wrap gap-1">
                                    {r.added_stores.map((s) => (
                                      <Link
                                        key={`${s.store_number}-${s.discovered_via}`}
                                        href={`/stores/${s.store_number}`}
                                        className={`text-xs font-mono px-2 py-1 rounded inline-flex items-center gap-1 hover:bg-[var(--color-accent)] hover:text-[#2a1f0f] ${
                                          s.discovered_via === 'lcbo_only'
                                            ? 'bg-[rgba(239,75,75,0.12)] text-[var(--color-danger)]'
                                            : 'bg-[rgba(255,255,255,0.05)]'
                                        }`}
                                        title={
                                          s.discovered_via === 'lcbo_only'
                                            ? 'lcbo.com only — SOD missed this listing'
                                            : 'SOD-detected'
                                        }
                                      >
                                        #{s.store_number}
                                        {s.lcbo_confirmed && <span title="lcbo.com confirmed">✓</span>}
                                      </Link>
                                    ))}
                                  </div>
                                </>
                              ) : (
                                <div className="text-xs text-muted py-2">
                                  No stores added in this comparison.
                                </div>
                              )}
                              {r.lost_stores.length > 0 && (
                                <>
                                  <div className="text-[10px] uppercase tracking-wider text-muted font-semibold mt-3">
                                    Stores lost ({r.lost_stores.length})
                                  </div>
                                  <div className="flex flex-wrap gap-1">
                                    {r.lost_stores.map((sn) => (
                                      <Link
                                        key={sn}
                                        href={`/stores/${sn}`}
                                        className="text-xs font-mono px-2 py-1 rounded bg-[rgba(253,203,110,0.12)] text-[var(--color-warning)] hover:bg-[var(--color-warning)] hover:text-[#2a1f0f]"
                                      >
                                        #{sn}
                                      </Link>
                                    ))}
                                  </div>
                                </>
                              )}
                            </td>
                          </tr>
                        )}
                      </>
                    );
                  })}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function FileSlot({
  label,
  file,
  onChange,
  inputRef,
}: {
  label: string;
  file: File | null;
  onChange: (f: File | null) => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] uppercase tracking-wider text-[var(--color-muted)] font-medium">
        {label}
      </label>
      <div className="flex items-center gap-3 flex-wrap">
        <input
          ref={inputRef}
          type="file"
          accept=".zip"
          onChange={(e) => onChange(e.target.files?.[0] ?? null)}
          className="hidden"
        />
        <Button
          size="sm"
          variant="secondary"
          onClick={() => inputRef.current?.click()}
          type="button"
        >
          <Upload size={14} />
          {file ? 'Change file' : 'Pick ZIP'}
        </Button>
        {file ? (
          <span className="text-xs text-muted flex items-center gap-1.5">
            <FileArchive size={12} />
            <span className="font-mono">{file.name}</span>
            <span>({(file.size / (1024 * 1024)).toFixed(1)} MB)</span>
            <button
              onClick={() => onChange(null)}
              className="text-[var(--color-danger)] hover:underline ml-2"
            >
              clear
            </button>
          </span>
        ) : (
          <span className="text-xs text-muted">No file selected</span>
        )}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  highlight,
  help,
}: {
  label: string;
  value: string;
  highlight?: 'success' | 'danger' | 'warning';
  help?: string;
}) {
  const color =
    highlight === 'success'
      ? 'var(--color-success)'
      : highlight === 'danger'
        ? 'var(--color-danger)'
        : highlight === 'warning'
          ? 'var(--color-warning)'
          : 'var(--color-foreground)';
  return (
    <div className="rounded-lg border border-[var(--color-card-border)] p-3 bg-[rgba(255,255,255,0.02)]" title={help}>
      <div className="text-[10px] uppercase tracking-wider text-[var(--color-muted)]">
        {label}
      </div>
      <div className="text-2xl font-semibold mt-1 tabular-nums" style={{ color }}>
        {value}
      </div>
      {help && <div className="text-[10px] text-muted mt-1">{help}</div>}
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
