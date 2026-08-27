import { Badge } from '@/components/ui/badge';
import type { EntityStatus, FilingStatus } from '@/lib/schemas';

const ENTITY_STATUS_VARIANT: Record<EntityStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  ACTIVE: 'default',
  PENDING: 'secondary',
  SUSPENDED: 'outline',
  DISSOLVED: 'destructive',
};

const FILING_STATUS_VARIANT: Record<FilingStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  PENDING: 'secondary',
  AI_PROCESSING: 'outline',
  FILED: 'default',
  CONFIRMED: 'default',
};

export function EntityStatusBadge({ status }: { status: EntityStatus }) {
  return <Badge variant={ENTITY_STATUS_VARIANT[status]}>{status}</Badge>;
}

export function FilingStatusBadge({ status }: { status: FilingStatus }) {
  return <Badge variant={FILING_STATUS_VARIANT[status]}>{status.replace('_', ' ')}</Badge>;
}

export function PriorityBadge({ priority }: { priority: 'LOW' | 'MEDIUM' | 'HIGH' }) {
  const variant = priority === 'HIGH' ? 'destructive' : priority === 'MEDIUM' ? 'secondary' : 'outline';
  return <Badge variant={variant}>{priority}</Badge>;
}
