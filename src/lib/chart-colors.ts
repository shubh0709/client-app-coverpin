import type { ComplianceStatus, EntityStatus } from './schemas';
import { COMPLIANCE_STATUSES, ENTITY_STATUSES } from './schemas';

/**
 * Color assignment, centralized. Every value here is a CSS custom property
 * defined in globals.css (see the "Dataviz tokens" blocks under :root/.dark),
 * lifted straight from the dataviz skill's validated reference palette
 * (light: worst adjacent CVD ΔE 9.1, normal-vision floor 19.6 — both PASS;
 * dark: 8.4 / 19.3 — both PASS; re-verified with scripts/validate_palette.js
 * before this palette was wired in).
 *
 * Categorical slots are assigned in FIXED order and never cycled or
 * re-ranked by filter state — colors identify an entity, not its position
 * in the current result set.
 */

/** The 8-hue categorical ramp, in the fixed order the palette validates against. */
export const CATEGORICAL_SLOTS = [
  'var(--viz-series-1)', // blue
  'var(--viz-series-2)', // orange
  'var(--viz-series-3)', // aqua
  'var(--viz-series-4)', // yellow
  'var(--viz-series-5)', // magenta
  'var(--viz-series-6)', // green
  'var(--viz-series-7)', // violet
  'var(--viz-series-8)', // red
] as const;

/** Fold anything past the 8th categorical slot into "Other" rather than generate a 9th hue. */
export const MAX_CATEGORICAL_SERIES = CATEGORICAL_SLOTS.length;

export const STATUS_COLORS = {
  good: 'var(--viz-status-good)',
  warning: 'var(--viz-status-warning)',
  serious: 'var(--viz-status-serious)',
  critical: 'var(--viz-status-critical)',
  neutral: 'var(--viz-status-neutral)',
} as const;

/** Fixed slots reserved for the two-series subsidiary/FQ comparisons (list-page
 * relation chips and analytics chart (c)) — kept in sync so the same relation
 * always reads as the same color everywhere it appears. */
export const RELATION_COLORS = {
  subsidiary: CATEGORICAL_SLOTS[0], // blue
  fq: CATEGORICAL_SLOTS[1], // orange
} as const;

/** Compliance status is a health ladder (good → critical), so it wears the
 * fixed status scale everywhere it's rendered — list-page badges and the
 * chart (a) breakdown share this one mapping. TBD/NOT_APPLICABLE aren't part
 * of the ladder itself, so both fall back to the neutral status step. */
export const COMPLIANCE_STATUS_COLOR: Record<ComplianceStatus, string> = {
  GOOD_STANDING: STATUS_COLORS.good,
  FILING_DUE: STATUS_COLORS.warning,
  OVERDUE: STATUS_COLORS.serious,
  SUSPENDED: STATUS_COLORS.critical,
  TBD: STATUS_COLORS.neutral,
  NOT_APPLICABLE: STATUS_COLORS.neutral,
};

/** Entity status is nominal identity (not a health ladder), so chart (b) gives
 * it the categorical ramp, one slot per enum value in a fixed order. */
export const ENTITY_STATUS_COLOR: Record<EntityStatus, string> = Object.fromEntries(
  ENTITY_STATUSES.map((status, i) => [status, CATEGORICAL_SLOTS[i % CATEGORICAL_SLOTS.length]]),
) as Record<EntityStatus, string>;

/** Neutral used for the ownership chart's "Unallocated" remainder — deliberately
 * not a categorical slot, since it isn't an entity's identity. */
export const UNALLOCATED_COLOR = 'var(--viz-muted)';

export function complianceStatusLabel(status: ComplianceStatus): string {
  return COMPLIANCE_STATUSES.includes(status) ? status.replaceAll('_', ' ') : status;
}
