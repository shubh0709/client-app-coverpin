'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { SearchIcon, UploadIcon, XIcon } from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import { COMPLIANCE_STATUSES, ENTITY_STATUSES } from '@/lib/schemas';
import type {
  ComplianceStatus,
  EntityListResponse,
  EntityStatus,
  EntitySuggestion,
  PageSize,
  TopLevelEntity,
} from '@/lib/schemas';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { EntityTable } from '@/components/entity-table';
import { EntityPagination } from '@/components/entity-pagination';
import { ApiErrorNotice } from '@/components/api-error-notice';

const ALL = '__all__';
const DEFAULT_PAGE_SIZE: PageSize = 10;

export default function ListPage() {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [entityStatus, setEntityStatus] = useState<EntityStatus | typeof ALL>(ALL);
  const [complianceStatus, setComplianceStatus] = useState<ComplianceStatus | typeof ALL>(ALL);
  const [jurisdiction, setJurisdiction] = useState<string>(ALL);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<PageSize>(DEFAULT_PAGE_SIZE);

  const [jurisdictionOptions, setJurisdictionOptions] = useState<string[]>([]);
  const [entities, setEntities] = useState<TopLevelEntity[] | null>(null);
  const [meta, setMeta] = useState({ page: 1, pageSize: DEFAULT_PAGE_SIZE as number, total: 0, totalPages: 1 });
  const [error, setError] = useState<string | null>(null);
  const [everHadData, setEverHadData] = useState(false);

  const [suggestions, setSuggestions] = useState<EntitySuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchBoxRef = useRef<HTMLDivElement>(null);

  // Debounce the search box so we don't fire a request per keystroke.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  // A shorter-debounced, separate fetch backs the autocomplete dropdown —
  // it needs to feel responsive as-you-type, independent of the (slower)
  // main list refetch above. An empty query just skips fetching; the
  // dropdown's own render guard (search.trim() !== '') is what hides any
  // stale suggestions, so there's nothing to clear here synchronously.
  useEffect(() => {
    const q = search.trim();
    if (!q) return;
    const controller = new AbortController();
    const t = setTimeout(() => {
      api
        .getSuggestions(q, controller.signal)
        .then((res) => setSuggestions(res.suggestions))
        .catch((err: unknown) => {
          if (err instanceof DOMException && err.name === 'AbortError') return;
          setSuggestions([]);
        });
    }, 150);
    return () => {
      clearTimeout(t);
      controller.abort();
    };
  }, [search]);

  // Closing the dropdown on an outside click (rather than onBlur) means a
  // click on a suggestion button still fires its own onClick before this
  // sees the click — onBlur would close the list first and swallow it.
  useEffect(() => {
    function handlePointerDown(e: MouseEvent) {
      if (!searchBoxRef.current?.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, []);

  /** Selecting a suggestion re-searches by its exact Entity Name — skipping
   * the debounce so it feels like a direct jump — which guarantees an exact
   * match and therefore the row highlight/auto-expand the user is after. */
  function selectSuggestion(entityName: string) {
    setSearch(entityName);
    setDebouncedSearch(entityName);
    setSuggestions([]);
    setShowSuggestions(false);
  }

  const clearSearch = useCallback(() => {
    setSearch('');
    setDebouncedSearch('');
    setSuggestions([]);
    setShowSuggestions(false);
  }, []);

  // Build the jurisdiction filter's option list from a dedicated endpoint
  // (not from a page of `listEntities`, which is now paginated and would
  // only reflect the jurisdictions on that one page).
  useEffect(() => {
    const controller = new AbortController();
    api
      .getJurisdictions(controller.signal)
      .then((res) => {
        setJurisdictionOptions(res.jurisdictions);
        setEverHadData(res.jurisdictions.length > 0);
      })
      .catch(() => {
        // Non-fatal (including an abort on unmount) — the main fetch below
        // surfaces the real error state.
      });
    return () => controller.abort();
  }, []);

  // Any filter change (other than page itself) should snap back to page 1 —
  // the previous page number is almost certainly meaningless for a new
  // filter set. Adjusted during render (React's documented pattern for
  // deriving state from a prop/state change) so the fetch effect below only
  // ever sees the already-reset page, never fires a request for a stale one.
  const filtersKey = JSON.stringify([debouncedSearch, entityStatus, complianceStatus, jurisdiction, pageSize]);
  const [prevFiltersKey, setPrevFiltersKey] = useState(filtersKey);
  if (filtersKey !== prevFiltersKey) {
    setPrevFiltersKey(filtersKey);
    if (page !== 1) setPage(1);
  }

  // A small in-memory cache of in-flight/completed requests, keyed by the
  // exact filters+page+pageSize that produced them. This is what makes
  // pagination feel instant: after a page loads, the next page is fetched
  // in the background and dropped in here, so clicking "next" just resolves
  // an already-settled (or already in-flight) promise instead of waiting on
  // a fresh round trip.
  type CacheEntry = { promise: Promise<EntityListResponse>; controller: AbortController };
  const cacheRef = useRef<Map<string, CacheEntry>>(new Map());

  function cacheKey(p: number) {
    return `${filtersKey}|${p}`;
  }

  /** Returns the cache entry for page `p`, creating it (with its own
   * AbortController) on a miss. `fresh` tells the caller whether *this call*
   * is the one that created it — only the creator may abort it. A cache hit
   * (e.g. a page the background prefetch already started) must never be
   * aborted by some other consumer's cleanup; it's shared, and letting it
   * finish in the background is the entire point of prefetching it. */
  function getOrCreate(p: number): { entry: CacheEntry; fresh: boolean } {
    const key = cacheKey(p);
    const existing = cacheRef.current.get(key);
    if (existing) return { entry: existing, fresh: false };
    const controller = new AbortController();
    const promise = api.listEntities(
      {
        search: debouncedSearch || undefined,
        entityStatus: entityStatus === ALL ? undefined : entityStatus,
        complianceStatus: complianceStatus === ALL ? undefined : complianceStatus,
        jurisdiction: jurisdiction === ALL ? undefined : jurisdiction,
        page: p,
        pageSize,
      },
      controller.signal,
    );
    const entry: CacheEntry = { promise, controller };
    cacheRef.current.set(key, entry);
    // A failed or aborted fetch never held valid data — don't leave it
    // cached, or a later visit to this page would replay the same rejection.
    promise.catch(() => cacheRef.current.delete(key));
    return { entry, fresh: true };
  }

  // No explicit "loading" boolean: the previous render is held on screen
  // while a refetch is in flight (see dataviz skill's "refetch keeps the
  // frame" rule) — `entities === null` alone distinguishes the very first
  // load. State is only ever set from inside the promise callbacks, never
  // synchronously in the effect body, so a stale filter change can't stomp a
  // newer one's result.
  useEffect(() => {
    const { entry, fresh } = getOrCreate(page);
    entry.promise
      .then((res) => {
        setEntities(res.data);
        setMeta({ page: res.page, pageSize: res.pageSize, total: res.total, totalPages: res.totalPages });
        setError(null);
        if (res.total > 0) setEverHadData(true);
        // Prefetch the next page in the background so it's ready by the
        // time the user clicks "next" — never awaited, never blocks render,
        // and never tied to this effect's cleanup (see getOrCreate above).
        if (res.page < res.totalPages) getOrCreate(res.page + 1).entry.promise.catch(() => {});
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setError(err instanceof ApiError ? err.message : 'Failed to load entities.');
        setEntities(null);
      });
    // Only abort a request this exact effect run created — a cache hit (a
    // page the prefetch already kicked off) is shared and must keep running.
    return () => {
      if (fresh) entry.controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtersKey, page]);

  const filtersActive =
    debouncedSearch !== '' || entityStatus !== ALL || complianceStatus !== ALL || jurisdiction !== ALL;

  const clearFilters = useCallback(() => {
    clearSearch();
    setEntityStatus(ALL);
    setComplianceStatus(ALL);
    setJurisdiction(ALL);
  }, [clearSearch]);

  const filterBar = useMemo(
    () => (
      <div className="flex flex-wrap items-center gap-2">
        <div ref={searchBoxRef} className="relative w-full max-w-xs">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onFocus={() => setShowSuggestions(true)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') setShowSuggestions(false);
            }}
            placeholder="Search entity name…"
            className="pl-8 pr-7"
            aria-label="Search entity name"
            autoComplete="off"
          />
          {search && (
            <button
              type="button"
              onClick={clearSearch}
              aria-label="Clear search"
              className="absolute top-1/2 right-1.5 flex size-5 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <XIcon className="size-3.5" />
            </button>
          )}
          {showSuggestions && search.trim() !== '' && suggestions.length > 0 && (
            <div className="absolute top-full z-20 mt-1 w-full overflow-hidden rounded-lg bg-popover text-popover-foreground shadow-md ring-1 ring-foreground/10">
              {suggestions.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => selectSuggestion(s.entityName)}
                  className="flex w-full flex-col items-start gap-0.5 px-3 py-1.5 text-left text-sm hover:bg-accent hover:text-accent-foreground"
                >
                  <span className="font-medium">{s.entityName}</span>
                  <span className="text-xs text-muted-foreground">
                    {s.jurisdiction} · {s.registrationType}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
        <Select
          value={entityStatus}
          onValueChange={(v) => setEntityStatus(v as EntityStatus | typeof ALL)}
        >
          <SelectTrigger aria-label="Filter by entity status">
            <SelectValue placeholder="Entity status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All entity statuses</SelectItem>
            {ENTITY_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={complianceStatus}
          onValueChange={(v) => setComplianceStatus(v as ComplianceStatus | typeof ALL)}
        >
          <SelectTrigger aria-label="Filter by compliance status">
            <SelectValue placeholder="Compliance status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All compliance statuses</SelectItem>
            {COMPLIANCE_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {s.replace('_', ' ')}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={jurisdiction} onValueChange={setJurisdiction}>
          <SelectTrigger aria-label="Filter by jurisdiction">
            <SelectValue placeholder="Jurisdiction" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All jurisdictions</SelectItem>
            {jurisdictionOptions.map((j) => (
              <SelectItem key={j} value={j}>
                {j}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {filtersActive && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            <XIcon /> Clear filters
          </Button>
        )}
      </div>
    ),
    [
      search,
      entityStatus,
      complianceStatus,
      jurisdiction,
      jurisdictionOptions,
      filtersActive,
      suggestions,
      showSuggestions,
      clearSearch,
      clearFilters,
    ],
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-semibold">Entities</h1>
          <p className="text-sm text-muted-foreground">
            Top-level entities with their foreign qualifications and subsidiaries.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/upload">
            <UploadIcon /> Upload data
          </Link>
        </Button>
      </div>

      {filterBar}

      {error && <ApiErrorNotice message={error} />}

      {!error && entities === null && (
        <p className="text-sm text-muted-foreground">Loading entities…</p>
      )}

      {!error && entities !== null && entities.length === 0 && !filtersActive && (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed p-10 text-center">
          <p className="text-sm font-medium">No entities yet</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            Upload your entities, ownership, and filings data (.csv or .xlsx) to populate the registry.
          </p>
          <Button asChild>
            <Link href="/upload">
              <UploadIcon /> Go to upload
            </Link>
          </Button>
        </div>
      )}

      {!error && entities !== null && entities.length === 0 && filtersActive && everHadData && (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed p-10 text-center">
          <p className="text-sm font-medium">No entities match your filters</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            Try a different search term or clear the filters below.
          </p>
          <Button variant="outline" onClick={clearFilters}>
            <XIcon /> Clear filters
          </Button>
        </div>
      )}

      {!error && entities !== null && entities.length > 0 && (
        <>
          <EntityTable entities={entities} searchTerm={debouncedSearch} />
          <EntityPagination
            page={meta.page}
            pageSize={pageSize}
            total={meta.total}
            totalPages={meta.totalPages}
            onPageChange={setPage}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setPage(1);
            }}
          />
        </>
      )}
    </div>
  );
}
