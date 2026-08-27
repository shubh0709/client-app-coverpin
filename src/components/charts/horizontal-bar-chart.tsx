import { ChartLegend, type LegendEntry } from './legend';

export interface BarSeriesValue {
  seriesKey: string;
  value: number;
}

export interface BarGroup {
  key: string;
  label: string;
  values: BarSeriesValue[];
}

export interface BarSeries {
  key: string;
  label: string;
  color: string;
}

/**
 * Horizontal grouped bar chart. Horizontal (not vertical columns) so long
 * category names — entity names, region names — get full-width labels
 * instead of rotated/truncated axis ticks (see dataviz skill's
 * choosing-a-form: "go horizontal for many/long-named categories").
 *
 * Every value is direct-labeled at the bar's end (counts here are always
 * small integers, so labeling every bar stays readable — the skill's "never
 * a number on every point" caution is about dense line/scatter charts, not a
 * handful of count bars) — so the value is reachable without hovering,
 * satisfying the "tooltips enhance, never gate" rule. A native `title`
 * attribute on each track adds a hover readout on top of that.
 */
export function HorizontalBarChart({
  groups,
  series,
  valueFormatter = (n: number) => String(n),
}: {
  groups: BarGroup[];
  series: BarSeries[];
  valueFormatter?: (n: number) => string;
}) {
  const max = Math.max(1, ...groups.flatMap((g) => g.values.map((v) => v.value)));
  const legend: LegendEntry[] = series.map((s) => ({ key: s.key, label: s.label, color: s.color }));

  return (
    <div>
      <ChartLegend entries={legend} />
      <div className="flex flex-col gap-4">
        {groups.map((group) => (
          <div key={group.key}>
            <div className="mb-1 truncate text-sm font-medium text-foreground" title={group.label}>
              {group.label}
            </div>
            <div className="flex flex-col gap-1">
              {series.map((s) => {
                const value = group.values.find((v) => v.seriesKey === s.key)?.value ?? 0;
                const pct = (value / max) * 100;
                return (
                  <div key={s.key} className="flex items-center gap-2">
                    {series.length > 1 && (
                      <span className="w-24 shrink-0 truncate text-xs text-muted-foreground">
                        {s.label}
                      </span>
                    )}
                    <div
                      className="h-3 flex-1 overflow-hidden rounded-full bg-muted/50"
                      title={`${group.label} — ${s.label}: ${valueFormatter(value)}`}
                    >
                      <div
                        className="h-full rounded-full transition-[width]"
                        style={{ width: `${pct}%`, backgroundColor: s.color }}
                      />
                    </div>
                    <span className="w-10 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
                      {valueFormatter(value)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
