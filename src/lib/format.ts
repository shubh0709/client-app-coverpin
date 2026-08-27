/** Formats an ISO date string (YYYY-MM-DD) for display; passes through anything
 * that doesn't parse cleanly rather than showing "Invalid Date". */
export function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatPercent(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—';
  return `${value % 1 === 0 ? value : value.toFixed(2)}%`;
}
