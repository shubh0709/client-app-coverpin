export interface LegendEntry {
  key: string;
  label: string;
  color: string;
}

/** A legend is always present for 2+ series — the dependable identity channel,
 * never color-matching alone. A single-series chart skips the legend box
 * entirely (its title already names what's plotted). */
export function ChartLegend({ entries }: { entries: LegendEntry[] }) {
  if (entries.length < 2) return null;
  return (
    <div className="mb-3 flex flex-wrap gap-x-4 gap-y-1.5">
      {entries.map((e) => (
        <div key={e.key} className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span
            className="size-2.5 shrink-0 rounded-[3px]"
            style={{ backgroundColor: e.color }}
            aria-hidden
          />
          {e.label}
        </div>
      ))}
    </div>
  );
}
