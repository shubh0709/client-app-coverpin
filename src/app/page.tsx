'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { SearchIcon, UploadIcon, XIcon } from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import { COMPLIANCE_STATUSES, collectJurisdictions, ENTITY_STATUSES } from '@/lib/schemas';
import type { ComplianceStatus, EntityStatus, TopLevelEntity } from '@/lib/schemas';
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

const ALL = '__all__';

export default function ListPage() {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [entityStatus, setEntityStatus] = useState<EntityStatus | typeof ALL>(ALL);
  const [complianceStatus, setComplianceStatus] = useState<ComplianceStatus | typeof ALL>(ALL);
  const [jurisdiction, setJurisdiction] = useState<string>(ALL);

  const [jurisdictionOptions, setJurisdictionOptions] = useState<string[]>([]);
  const [entities, setEntities] = useState<TopLevelEntity[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [everHadData, setEverHadData] = useState(false);

  // Debounce the search box so we don't fire a request per keystroke.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  // Build the jurisdiction filter's option list from an unfiltered fetch once,
  // so the dropdown doesn't lose options as the user narrows other filters.
  useEffect(() => {
    api
      .listEntities()
      .then((res) => {
        const set = new Set<string>();
        collectJurisdictions(res.data, set);
        setJurisdictionOptions([...set].sort());
        setEverHadData(res.data.length > 0);
      })
      .catch(() => {
        // Non-fatal — the main fetch below surfaces the real error state.
      });
  }, []);

  // No explicit "loading" boolean: the previous render is held on screen
  // while a refetch is in flight (see dataviz skill's "refetch keeps the
  // frame" rule) — `entities === null` alone distinguishes the very first
  // load. State is only ever set from inside the promise callbacks, never
  // synchronously in the effect body, so a stale filter change can't stomp a
  // newer one's result.
  useEffect(() => {
    let cancelled = false;
    api
      .listEntities({
        search: debouncedSearch || undefined,
        entityStatus: entityStatus === ALL ? undefined : entityStatus,
        complianceStatus: complianceStatus === ALL ? undefined : complianceStatus,
        jurisdiction: jurisdiction === ALL ? undefined : jurisdiction,
      })
      .then((res) => {
        if (cancelled) return;
        setEntities(res.data);
        setError(null);
        if (res.data.length > 0) setEverHadData(true);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof ApiError ? err.message : 'Failed to load entities.');
        setEntities(null);
      });
    return () => {
      cancelled = true;
    };
  }, [debouncedSearch, entityStatus, complianceStatus, jurisdiction]);

  const filtersActive =
    debouncedSearch !== '' || entityStatus !== ALL || complianceStatus !== ALL || jurisdiction !== ALL;

  function clearFilters() {
    setSearch('');
    setDebouncedSearch('');
    setEntityStatus(ALL);
    setComplianceStatus(ALL);
    setJurisdiction(ALL);
  }

  const filterBar = useMemo(
    () => (
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full max-w-xs">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search entity name…"
            className="pl-8"
            aria-label="Search entity name"
          />
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
    [search, entityStatus, complianceStatus, jurisdiction, jurisdictionOptions, filtersActive],
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

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          {error} Make sure the backend is running at{' '}
          <code>{process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'}</code>.
        </div>
      )}

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
        <EntityTable entities={entities} />
      )}
    </div>
  );
}
