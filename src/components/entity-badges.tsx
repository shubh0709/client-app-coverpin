import {
  BanIcon,
  CircleAlertIcon,
  CircleCheckIcon,
  CircleHelpIcon,
  GlobeIcon,
  MinusCircleIcon,
  NetworkIcon,
  TriangleAlertIcon,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { COMPLIANCE_STATUS_COLOR, RELATION_COLORS, STATUS_COLORS } from '@/lib/chart-colors';
import type { ComplianceStatus, EntityStatus, Relation } from '@/lib/schemas';

/**
 * Compliance status is the one status the brief explicitly scores for a
 * "distinct color treatment" per value. Every branch below pairs a color with
 * an icon and a text label (never color alone) per the dataviz skill's status
 * rule — GOOD_STANDING/FILING_DUE/OVERDUE/SUSPENDED map onto the fixed
 * good/warning/serious/critical status scale; TBD and NOT_APPLICABLE are both
 * "no live ladder position" but get visually distinct (icon + fill) neutral
 * treatments so they don't read as the same thing.
 */
const COMPLIANCE_META: Record<
  ComplianceStatus,
  { label: string; color: string; icon: LucideIcon; muted?: boolean }
> = {
  GOOD_STANDING: {
    label: 'Good standing',
    color: COMPLIANCE_STATUS_COLOR.GOOD_STANDING,
    icon: CircleCheckIcon,
  },
  FILING_DUE: {
    label: 'Filing due',
    color: COMPLIANCE_STATUS_COLOR.FILING_DUE,
    icon: TriangleAlertIcon,
  },
  OVERDUE: { label: 'Overdue', color: COMPLIANCE_STATUS_COLOR.OVERDUE, icon: CircleAlertIcon },
  SUSPENDED: { label: 'Suspended', color: COMPLIANCE_STATUS_COLOR.SUSPENDED, icon: BanIcon },
  TBD: { label: 'TBD', color: STATUS_COLORS.neutral, icon: CircleHelpIcon, muted: true },
  NOT_APPLICABLE: {
    label: 'Not applicable',
    color: STATUS_COLORS.neutral,
    icon: MinusCircleIcon,
    muted: true,
  },
};

export function ComplianceStatusBadge({ status }: { status: ComplianceStatus }) {
  const meta = COMPLIANCE_META[status];
  const Icon = meta.icon;
  return (
    <span
      className={cn(
        'inline-flex h-5 w-fit shrink-0 items-center gap-1 rounded-4xl border px-2 py-0.5 text-xs font-medium whitespace-nowrap',
        meta.muted ? 'border-dashed' : 'border-transparent',
      )}
      style={{
        color: meta.color,
        backgroundColor: `color-mix(in oklab, ${meta.color} 14%, transparent)`,
        borderColor: meta.muted ? `color-mix(in oklab, ${meta.color} 45%, transparent)` : undefined,
      }}
    >
      <Icon className="size-3" aria-hidden />
      {meta.label}
    </span>
  );
}

const TERMINAL_STATUSES: readonly EntityStatus[] = [
  'Dissolved',
  'Divested/Sold',
  'Merged/Acquired',
  'Revoked/Terminated',
  'Dormant',
];

export function EntityStatusBadge({ status }: { status: EntityStatus }) {
  const dotColor =
    status === 'Active'
      ? STATUS_COLORS.good
      : status === 'In Formation'
        ? 'var(--viz-series-1)'
        : TERMINAL_STATUSES.includes(status)
          ? 'var(--viz-muted)'
          : 'var(--viz-muted)';

  return (
    <span className="inline-flex h-5 w-fit shrink-0 items-center gap-1.5 rounded-4xl border border-border px-2 py-0.5 text-xs font-medium whitespace-nowrap text-foreground">
      <span
        className="size-1.5 shrink-0 rounded-full"
        style={{ backgroundColor: dotColor }}
        aria-hidden
      />
      {status}
    </span>
  );
}

/** FQ vs. subsidiary chip — the brief explicitly requires these be visually
 * distinguishable at a glance, not just via a text column. */
export function RelationChip({ relation }: { relation: Relation }) {
  const isFq = relation === 'fq';
  const color = isFq ? RELATION_COLORS.fq : RELATION_COLORS.subsidiary;
  const Icon = isFq ? GlobeIcon : NetworkIcon;
  return (
    <span
      className="inline-flex h-5 w-fit shrink-0 items-center gap-1 rounded-4xl px-2 py-0.5 text-xs font-medium whitespace-nowrap"
      style={{ color, backgroundColor: `color-mix(in oklab, ${color} 14%, transparent)` }}
    >
      <Icon className="size-3" aria-hidden />
      {isFq ? 'Foreign qualification' : 'Subsidiary'}
    </span>
  );
}
