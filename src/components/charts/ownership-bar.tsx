import { CATEGORICAL_SLOTS, UNALLOCATED_COLOR } from '@/lib/chart-colors';
import { ChartLegend, type LegendEntry } from './legend';
import type { OwnershipChildShare } from '@/lib/schemas';

const MAX_DIRECT_CHILDREN = 7; // leave the 8th categorical slot for "Other"

/**
 * Ownership % across a selected parent's children, rendered as a single
 * horizontal 100%-stacked bar (not a pie/donut — the dataviz skill's
 * part-to-whole guidance prefers a stacked bar, especially with long entity
 * names as segment labels). The unallocated remainder is always its own
 * segment, in the reserved neutral token, never hidden.
 */
export function OwnershipBar({
  shares,
  unallocatedPct,
}: {
  shares: OwnershipChildShare[];
  unallocatedPct: number;
}) {
  const direct = shares.slice(0, MAX_DIRECT_CHILDREN);
  const overflow = shares.slice(MAX_DIRECT_CHILDREN);
  const overflowPct = overflow.reduce((sum, c) => sum + c.pct, 0);

  const segments = [
    ...direct.map((c, i) => ({
      key: c.entityName,
      label: c.entityName,
      pct: c.pct,
      color: CATEGORICAL_SLOTS[i],
    })),
    ...(overflow.length > 0
      ? [
          {
            key: '__other__',
            label: `Other (${overflow.length})`,
            pct: overflowPct,
            color: CATEGORICAL_SLOTS[7],
          },
        ]
      : []),
    {
      key: '__unallocated__',
      label: 'Unallocated',
      pct: unallocatedPct,
      color: UNALLOCATED_COLOR,
    },
  ].filter((s) => s.pct > 0);

  const legend: LegendEntry[] = segments.map((s) => ({
    key: s.key,
    label: `${s.label} — ${formatPct(s.pct)}`,
    color: s.color,
  }));

  return (
    <div>
      <div className="flex h-7 w-full gap-0.5 overflow-hidden rounded-md">
        {segments.map((s) => (
          <div
            key={s.key}
            className="h-full first:rounded-l-md last:rounded-r-md"
            style={{ width: `${s.pct}%`, backgroundColor: s.color }}
            title={`${s.label}: ${formatPct(s.pct)}`}
          />
        ))}
      </div>
      <div className="mt-3">
        <ChartLegend entries={legend} />
      </div>
    </div>
  );
}

function formatPct(pct: number): string {
  return `${pct % 1 === 0 ? pct : pct.toFixed(2)}%`;
}
