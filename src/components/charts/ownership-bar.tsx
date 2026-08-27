import { CATEGORICAL_SLOTS, UNALLOCATED_COLOR } from '@/lib/chart-colors';
import type { OwnershipChildShare } from '@/lib/schemas';

/**
 * One two-segment horizontal bar per selected parent's direct child: total
 * ownership allocated to that child across ALL of its parents (not just the
 * selected one) vs. that child's own unallocated remainder. Each child gets
 * its own bar — every child's total is an independent number, so there's no
 * shared "whole" to stack them into together.
 */
export function OwnershipBar({ shares }: { shares: OwnershipChildShare[] }) {
  const sorted = [...shares].sort((a, b) => b.pct - a.pct);

  return (
    <div className="flex flex-col gap-4">
      {sorted.map((share) => (
        <div key={share.entityName} className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between gap-2 text-sm">
            <span className="font-medium">{share.entityName}</span>
            <span className="shrink-0 text-muted-foreground">
              {formatPct(share.pct)} allocated
              {share.unallocatedPct > 0 && ` · ${formatPct(share.unallocatedPct)} unallocated`}
            </span>
          </div>
          <div className="flex h-3 w-full gap-0.5 overflow-hidden rounded-md bg-muted">
            {share.pct > 0 && (
              <div
                className="h-full first:rounded-l-md last:rounded-r-md"
                style={{ width: `${share.pct}%`, backgroundColor: CATEGORICAL_SLOTS[0] }}
                title={`Allocated: ${formatPct(share.pct)}`}
              />
            )}
            {share.unallocatedPct > 0 && (
              <div
                className="h-full first:rounded-l-md last:rounded-r-md"
                style={{ width: `${share.unallocatedPct}%`, backgroundColor: UNALLOCATED_COLOR }}
                title={`Unallocated: ${formatPct(share.unallocatedPct)}`}
              />
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function formatPct(pct: number): string {
  return `${pct % 1 === 0 ? pct : pct.toFixed(2)}%`;
}
