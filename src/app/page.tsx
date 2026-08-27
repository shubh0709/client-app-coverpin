'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useQueryClient } from '@tanstack/react-query';
import { SearchIcon, UploadIcon, XIcon } from 'lucide-react';
import { toast } from 'sonner';
import { api, ApiError } from '@/lib/api';
import { queryKeys, useEntities, useJurisdictions, useSuggestions } from '@/lib/queries';
import { COMPLIANCE_STATUSES, ENTITY_STATUSES } from '@/lib/schemas';
import type {
  ComplianceStatus,
  EntityListFilters,
  EntityStatus,
  EntitySuggestion,
  PageSize,
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
// Stable references so an undefined query result doesn't produce a fresh
// `[]` on every render — that would otherwise defeat the `filterBar` useMemo
// below, which lists these among its dependencies.
const EMPTY_JURISDICTIONS: string[] = [];
const EMPTY_SUGGESTIONS: EntitySuggestion[] = [];

export default function ListPage() {
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [entityStatus, setEntityStatus] = useState<EntityStatus | typeof ALL>(ALL);
  const [complianceStatus, setComplianceStatus] = useState<ComplianceStatus | typeof ALL>(ALL);
  const [jurisdiction, setJurisdiction] = useState<string>(ALL);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<PageSize>(DEFAULT_PAGE_SIZE);

  const [everHadData, setEverHadData] = useState(false);

  // A separate, shorter-debounced query backs the autocomplete dropdown — it
  // needs to feel responsive as-you-type, independent of the (slower) main
  // list refetch below.
  const [suggestQuery, setSuggestQuery] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setSuggestQuery(search.trim()), 150);
    return () => clearTimeout(t);
  }, [search]);
  const suggestionsQuery = useSuggestions(suggestQuery);
  const suggestions = suggestionsQuery.data?.suggestions ?? EMPTY_SUGGESTIONS;

  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchBoxRef = useRef<HTMLDivElement>(null);

  // Debounce the search box so we don't fire a request per keystroke.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
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
    setSuggestQuery('');
    setShowSuggestions(false);
  }

  const clearSearch = useCallback(() => {
    setSearch('');
    setDebouncedSearch('');
    setSuggestQuery('');
    setShowSuggestions(false);
  }, []);

  // Build the jurisdiction filter's option list from a dedicated endpoint
  // (not from a page of `listEntities`, which is now paginated and would
  // only reflect the jurisdictions on that one page). Cached and shared with
  // the analytics page — navigating between them no longer refetches it.
  const jurisdictionsQuery = useJurisdictions();
  const jurisdictionOptions = jurisdictionsQuery.data?.jurisdictions ?? EMPTY_JURISDICTIONS;

  // Any filter change (other than page itself) should snap back to page 1 —
  // the previous page number is almost certainly meaningless for a new
  // filter set. Adjusted during render (React's documented pattern for
  // deriving state from a prop/state change) so the fetch below only ever
  // sees the already-reset page, never fires a request for a stale one.
  const filtersKey = JSON.stringify([debouncedSearch, entityStatus, complianceStatus, jurisdiction, pageSize]);
  const [prevFiltersKey, setPrevFiltersKey] = useState(filtersKey);
  if (filtersKey !== prevFiltersKey) {
    setPrevFiltersKey(filtersKey);
    if (page !== 1) setPage(1);
  }

  const entityFilters: EntityListFilters = useMemo(
    () => ({
      search: debouncedSearch || undefined,
      entityStatus: entityStatus === ALL ? undefined : entityStatus,
      complianceStatus: complianceStatus === ALL ? undefined : complianceStatus,
      jurisdiction: jurisdiction === ALL ? undefined : jurisdiction,
      page,
      pageSize,
    }),
    [debouncedSearch, entityStatus, complianceStatus, jurisdiction, page, pageSize],
  );

  // Cached per exact filters+page+pageSize, and held on screen (via
  // `placeholderData: keepPreviousData` inside useEntities) while a refetch
  // is in flight — `isPending` alone distinguishes the very first load.
  const entitiesQuery = useEntities(entityFilters);
  const entities = entitiesQuery.data?.data ?? null;
  const meta = entitiesQuery.data
    ? {
        page: entitiesQuery.data.page,
        pageSize: entitiesQuery.data.pageSize,
        total: entitiesQuery.data.total,
        totalPages: entitiesQuery.data.totalPages,
      }
    : { page: 1, pageSize, total: 0, totalPages: 1 };

  // Sticky "has any data ever loaded" flag — once either signal goes
  // positive it stays true, distinguishing "nothing uploaded yet" from "this
  // filter matches nothing". Derived during render (React's documented
  // pattern for adjusting state from a change, same as `prevFiltersKey`
  // above) rather than in an effect, since it only ever needs to flip one
  // way and the guard prevents any render loop.
  const hasDataNow = (jurisdictionsQuery.data?.jurisdictions.length ?? 0) > 0 || (entitiesQuery.data?.total ?? 0) > 0;
  if (hasDataNow && !everHadData) setEverHadData(true);

  const error =
    entitiesQuery.error instanceof ApiError ? entitiesQuery.error.message : entitiesQuery.error ? 'Failed to load entities.' : null;
  useEffect(() => {
    if (entitiesQuery.error) {
      const message = entitiesQuery.error instanceof ApiError ? entitiesQuery.error.message : 'Failed to load entities.';
      toast.error(message);
    }
  }, [entitiesQuery.error]);

  // Prefetch the next page in the background so it's ready by the time the
  // user clicks "next" — dropped straight into the query cache under its own
  // key, so clicking "next" just reads an already-settled cache entry.
  useEffect(() => {
    const data = entitiesQuery.data;
    if (!data || data.page >= data.totalPages) return;
    const nextFilters: EntityListFilters = { ...entityFilters, page: data.page + 1 };
    queryClient.prefetchQuery({
      queryKey: queryKeys.entities(nextFilters),
      queryFn: ({ signal }) => api.listEntities(nextFilters, signal),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entitiesQuery.data]);

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

