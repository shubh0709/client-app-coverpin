'use client';

import { useEffect, useRef, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { ENTITY_STATUSES } from '@/lib/schemas';
import type { AnalyticsResponse, EntityStatus } from '@/lib/schemas';
import {
  ENTITY_STATUS_COLOR,
  RELATION_COLORS,
} from '@/lib/chart-colors';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ChartCard } from '@/components/charts/chart-card';
import { ComplianceBreakdownChart } from '@/components/charts/compliance-breakdown-chart';
import { HorizontalBarChart, type BarGroup, type BarSeries } from '@/components/charts/horizontal-bar-chart';
import { OwnershipBar } from '@/components/charts/ownership-bar';

const ALL = '__all__';
const NONE = '__none__';

export default function AnalyticsPage() {
  const [jurisdiction, setJurisdiction] = useState<string>(ALL);
  const [entityStatus, setEntityStatus] = useState<EntityStatus | typeof ALL>(ALL);
  const [parentEntityId, setParentEntityId] = useState<string | null>(null);

  const [jurisdictionOptions, setJurisdictionOptions] = useState<string[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasAnyData, setHasAnyData] = useState<boolean | null>(null);
  const autoSelectedParent = useRef(false);

  // Jurisdiction options come from a dedicated endpoint (not a page of
  // `listEntities`, which is paginated) — its non-emptiness also tells us
  // whether "empty" means "nothing uploaded yet" or "the current filter
  // excludes everything", which are required to be distinct, explicit empty
  // states, never the same blank chart.
  useEffect(() => {
    const controller = new AbortController();
    api
      .getJurisdictions(controller.signal)
      .then((res) => {
        setJurisdictionOptions(res.jurisdictions);
        setHasAnyData(res.jurisdictions.length > 0);
      })
      .catch(() => {
        // Non-fatal (including an abort on unmount) — page filters just
        // won't have jurisdiction options yet.
      });
    return () => controller.abort();
  }, []);

  // No explicit "loading" boolean — see the same note on the list page.
  // State is only ever set inside the promise callbacks below. An
  // AbortController (not just a `cancelled` flag) so a superseded request
  // is actually cancelled on the wire, not just ignored once it lands.
  useEffect(() => {
    const controller = new AbortController();
    api
      .getAnalytics(
        {
          jurisdiction: jurisdiction === ALL ? undefined : jurisdiction,
          entityStatus: entityStatus === ALL ? undefined : entityStatus,
          parentEntityId: parentEntityId ?? undefined,
        },
        controller.signal,
      )
      .then((res) => {
        setAnalytics(res);
        setError(null);
        // Sync the parent dropdown to the backend's default pick once, so the
        // ownership chart isn't blank on first load.
        if (!autoSelectedParent.current && parentEntityId === null && res.ownershipByParent.selectedParentId) {
          autoSelectedParent.current = true;
          setParentEntityId(res.ownershipByParent.selectedParentId);
        }
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setError(err instanceof ApiError ? err.message : 'Failed to load analytics.');
      });
    return () => controller.abort();
  }, [jurisdiction, entityStatus, parentEntityId]);

  const complianceData = analytics?.complianceBreakdown ?? [];
  const complianceTotal = complianceData.reduce((sum, d) => sum + d.count, 0);

  const regionGroups: BarGroup[] = [];
  const regionSeriesKeys = new Set<string>();
  if (analytics) {
    const byRegion = new Map<string, Map<string, number>>();
    for (const point of analytics.entityStatusByRegion) {
      regionSeriesKeys.add(point.entityStatus);
      if (!byRegion.has(point.region)) byRegion.set(point.region, new Map());
      byRegion.get(point.region)!.set(point.entityStatus, point.count);
    }
    for (const [region, counts] of byRegion) {
      regionGroups.push({
        key: region,
        label: region,
        values: [...counts.entries()].map(([seriesKey, value]) => ({ seriesKey, value })),
      });
    }
  }
  const regionSeries: BarSeries[] = ENTITY_STATUSES.filter((s) => regionSeriesKeys.has(s)).map((s) => ({
    key: s,
    label: s,
    color: ENTITY_STATUS_COLOR[s],
  }));

  const topLevelGroups: BarGroup[] = (analytics?.subsidiaryFqCountByTopLevel ?? []).map((d) => ({
    key: d.entityName,
    label: d.entityName,
    values: [
      { seriesKey: 'subsidiaries', value: d.subsidiaries },
      { seriesKey: 'fqs', value: d.fqs },
    ],
  }));
  const topLevelSeries: BarSeries[] = [
    { key: 'subsidiaries', label: 'Subsidiaries', color: RELATION_COLORS.subsidiary },
    { key: 'fqs', label: 'FQs', color: RELATION_COLORS.fq },
  ];

  const parents = analytics?.ownershipByParent.parents ?? [];

  const noDataMessage = 'No data uploaded yet — upload entities, ownership, and filings to see this chart.';
  const emptyMessageFor = (filteredMessage: string) =>
    hasAnyData === false ? noDataMessage : filteredMessage;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold">Analytics</h1>
        <p className="text-sm text-muted-foreground">
          Portfolio-wide compliance, geography, and ownership structure.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
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
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          {error} Make sure the backend is running at{' '}
          <code>{process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'}</code>.
        </div>
      )}

      {!error && analytics === null && (
        <p className="text-sm text-muted-foreground">Loading analytics…</p>
      )}

      {!error && analytics && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <ChartCard
            title="Compliance status breakdown"
            description="Every registration (top-level, FQ, and subsidiary), by compliance status."
            isEmpty={complianceTotal === 0}
            emptyMessage={emptyMessageFor('No entities match the current filters.')}
          >
            <ComplianceBreakdownChart data={complianceData} />
          </ChartCard>

          <ChartCard
            title="Ownership by parent"
            description="Each child's total ownership across all of its parents, plus its own unallocated remainder."
            isEmpty={parents.length === 0}
            emptyMessage={emptyMessageFor(
              'No entities match the current filters, or none of the matching entities own subsidiaries.',
            )}
          >
            <div className="flex flex-col gap-4">
              <Select
                value={parentEntityId ?? NONE}
                onValueChange={(v) => setParentEntityId(v === NONE ? null : v)}
              >
                <SelectTrigger aria-label="Select parent entity" className="w-full">
                  <SelectValue placeholder="Select a parent entity" />
                </SelectTrigger>
                <SelectContent>
                  {parents.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.entityName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {parentEntityId ? (
                <OwnershipBar shares={analytics.ownershipByParent.children} />
              ) : (
                <p className="text-sm text-muted-foreground">
                  Select a parent above to see its ownership breakdown.
                </p>
              )}
            </div>
          </ChartCard>

          <ChartCard
            title="Entity status by region"
            description="Entities with no Global Region are grouped under Unspecified."
            isEmpty={regionGroups.length === 0}
            emptyMessage={emptyMessageFor('No entities match the current filters.')}
          >
            <HorizontalBarChart groups={regionGroups} series={regionSeries} />
          </ChartCard>

          <ChartCard
            title="Subsidiaries vs. FQs per top-level entity"
            description="Full descendant set at any depth, deduplicated by entity."
            isEmpty={topLevelGroups.length === 0}
            emptyMessage={emptyMessageFor('No top-level entities match the current filters.')}
          >
            <HorizontalBarChart groups={topLevelGroups} series={topLevelSeries} />
          </ChartCard>
        </div>
      )}
    </div>
  );
}
