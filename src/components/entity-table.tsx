'use client';

import { Fragment, useState } from 'react';
import { ChevronRightIcon } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ComplianceStatusBadge, EntityStatusBadge, RelationChip } from '@/components/entity-badges';
import { formatDate, formatPercent } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { TopLevelEntity } from '@/lib/schemas';

export function EntityTable({ entities }: { entities: TopLevelEntity[] }) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="overflow-hidden rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-8" />
            <TableHead>Entity</TableHead>
            <TableHead>Jurisdiction</TableHead>
            <TableHead>Entity type</TableHead>
            <TableHead>Entity status</TableHead>
            <TableHead>Compliance status</TableHead>
            <TableHead>Next due date</TableHead>
            <TableHead>Subsidiaries</TableHead>
            <TableHead>FQs</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {entities.map((entity) => {
            const isOpen = expanded.has(entity.id);
            const hasChildren = entity.children.length > 0;
            return (
              <Fragment key={entity.id}>
                <TableRow
                  aria-expanded={hasChildren ? isOpen : undefined}
                  className={cn(hasChildren && 'cursor-pointer')}
                  onClick={hasChildren ? () => toggle(entity.id) : undefined}
                >
                  <TableCell>
                    {hasChildren && (
                      <ChevronRightIcon
                        className={cn(
                          'size-4 text-muted-foreground transition-transform',
                          isOpen && 'rotate-90',
                        )}
                        aria-hidden
                      />
                    )}
                  </TableCell>
                  <TableCell className="font-medium">{entity.entityName}</TableCell>
                  <TableCell className="text-muted-foreground">{entity.jurisdiction}</TableCell>
                  <TableCell className="text-muted-foreground">{entity.entityType}</TableCell>
                  <TableCell>
                    <EntityStatusBadge status={entity.entityStatus} />
                  </TableCell>
                  <TableCell>
                    <ComplianceStatusBadge status={entity.complianceStatus} />
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(entity.nextDueDate)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{entity.subsidiaryCount}</TableCell>
                  <TableCell className="text-muted-foreground">{entity.fqCount}</TableCell>
                </TableRow>
                {isOpen &&
                  entity.children.map((child) => (
                    <TableRow key={child.id} className="bg-muted/30 hover:bg-muted/50">
                      <TableCell />
                      <TableCell className="pl-6 font-medium text-foreground">
                        <span className="text-muted-foreground">↳</span> {child.entityName}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{child.jurisdiction}</TableCell>
                      <TableCell className="text-muted-foreground">{child.entityType}</TableCell>
                      <TableCell>
                        <EntityStatusBadge status={child.entityStatus} />
                      </TableCell>
                      <TableCell>
                        <ComplianceStatusBadge status={child.complianceStatus} />
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(child.nextDueDate)}
                      </TableCell>
                      <TableCell colSpan={2}>
                        <div className="flex items-center gap-2">
                          <RelationChip relation={child.relation} />
                          {child.relation === 'subsidiary' && (
                            <span className="text-xs text-muted-foreground">
                              {formatPercent(child.ownershipPct)} owned
                            </span>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
              </Fragment>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
