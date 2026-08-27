import { COMPLIANCE_STATUS_COLOR, complianceStatusLabel } from '@/lib/chart-colors';
import type { ComplianceBreakdownPoint } from '@/lib/schemas';

/**
 * Compliance status is a health ladder (good → critical), not an arbitrary
 * identity — so each bar wears the fixed status color for its own status
 * (the "collision rule": a series that means good/bad wears status tokens,
 * never categorical). One bar per status, so no legend box is needed — each
 * bar carries its own label.
 */
export function ComplianceBreakdownChart({ data }: { data: ComplianceBreakdownPoint[] }) {
  const max = Math.max(1, ...data.map((d) => d.count));
  return (
    <div className="flex flex-col gap-2">
      {data.map((d) => {
        const color = COMPLIANCE_STATUS_COLOR[d.status];
        const pct = (d.count / max) * 100;
        return (
          <div key={d.status} className="flex items-center gap-2">
            <span className="w-32 shrink-0 truncate text-xs text-muted-foreground">
              {complianceStatusLabel(d.status)}
            </span>
            <div
              className="h-4 flex-1 overflow-hidden rounded-full bg-muted/50"
              title={`${complianceStatusLabel(d.status)}: ${d.count}`}
            >
              <div
                className="h-full rounded-full transition-[width]"
                style={{ width: `${pct}%`, backgroundColor: color }}
              />
            </div>
            <span className="w-8 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
              {d.count}
            </span>
          </div>
        );
      })}
    </div>
  );
}
